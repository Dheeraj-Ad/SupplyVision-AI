import os
import json
import logging
from typing import Dict, List, Any, Tuple
import networkx as nx
from app.core.config import settings

# Attempt to import neo4j
try:
    from neo4j import GraphDatabase
    NEO4J_AVAILABLE = True
except ImportError:
    NEO4J_AVAILABLE = False

logger = logging.getLogger("graph_service")

class GraphService:
    def __init__(self):
        self.use_neo4j = False
        self.driver = None
        
        # Test Neo4j connection if configured
        if NEO4J_AVAILABLE and settings.NEO4J_URI and settings.NEO4J_PASSWORD:
            try:
                self.driver = GraphDatabase.driver(
                    settings.NEO4J_URI, 
                    auth=(settings.NEO4J_USER, settings.NEO4J_PASSWORD)
                )
                # Quick connection verification
                self.driver.verify_connectivity()
                self.use_neo4j = True
                logger.info("Connected successfully to Neo4j Aura.")
            except Exception as e:
                logger.warning(f"Failed to connect to Neo4j. Falling back to NetworkX Local Graph. Error: {e}")
        else:
            logger.info("No Neo4j credentials provided. Initializing NetworkX Local Graph.")

        # Local Graph Init (Fallback)
        self.local_db_path = os.path.join(
            os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))), 
            "data", 
            "graph_twin.json"
        )
        self.nx_graph = nx.DiGraph()
        self._load_local_graph()

    def _load_local_graph(self):
        """Loads graph from local JSON file if exists."""
        if os.path.exists(self.local_db_path):
            try:
                with open(self.local_db_path, 'r') as f:
                    data = json.load(f)
                    
                # Reconstruct graph
                for node in data.get("nodes", []):
                    self.nx_graph.add_node(node["id"], **node["properties"])
                for edge in data.get("edges", []):
                    self.nx_graph.add_edge(edge["source"], edge["target"], **edge["properties"])
                logger.info(f"Loaded {len(self.nx_graph.nodes)} nodes from local file.")
            except Exception as e:
                logger.error(f"Error loading local graph: {e}")
        else:
            # Create a default empty data structure if not exists
            self._save_local_graph()

    def _save_local_graph(self):
        """Saves current NetworkX graph state to local JSON file."""
        os.makedirs(os.path.dirname(self.local_db_path), exist_ok=True)
        nodes = []
        for node_id, data in self.nx_graph.nodes(data=True):
            nodes.append({
                "id": node_id,
                "properties": data
            })
        edges = []
        for source, target, data in self.nx_graph.edges(data=True):
            edges.append({
                "source": source,
                "target": target,
                "properties": data
            })
        
        try:
            with open(self.local_db_path, 'w') as f:
                json.dump({"nodes": nodes, "edges": edges}, f, indent=2)
        except Exception as e:
            logger.error(f"Failed to save local graph state: {e}")

    # Close driver helper
    def close(self):
        if self.driver:
            self.driver.close()

    # --- Supplier Operations ---
    def add_supplier(self, org_id: str, supplier_id: str, data: Dict[str, Any]):
        props = {
            "node_id": supplier_id,
            "org_id": org_id,
            "label": "Supplier",
            "current_risk_score": 0,
            **data
        }
        if self.use_neo4j:
            cypher = """
            MERGE (s:Supplier {node_id: $node_id, org_id: $org_id})
            ON CREATE SET s += $props
            ON MATCH SET s += $props
            RETURN s
            """
            with self.driver.session() as session:
                session.run(cypher, node_id=supplier_id, org_id=org_id, props=props)
        else:
            self.nx_graph.add_node(supplier_id, **props)
            self._save_local_graph()

    def get_suppliers(self, org_id: str) -> List[Dict[str, Any]]:
        if self.use_neo4j:
            cypher = "MATCH (s:Supplier {org_id: $org_id}) RETURN s"
            with self.driver.session() as session:
                result = session.run(cypher, org_id=org_id)
                return [dict(record["s"]) for record in result]
        else:
            suppliers = []
            for node_id, props in self.nx_graph.nodes(data=True):
                if props.get("org_id") == org_id and props.get("label") == "Supplier":
                    suppliers.append(props)
            return suppliers

    def delete_supplier(self, org_id: str, supplier_id: str):
        if self.use_neo4j:
            cypher = "MATCH (s:Supplier {node_id: $node_id, org_id: $org_id}) DETACH DELETE s"
            with self.driver.session() as session:
                session.run(cypher, node_id=supplier_id, org_id=org_id)
        else:
            if self.nx_graph.has_node(supplier_id):
                self.nx_graph.remove_node(supplier_id)
                self._save_local_graph()

    # --- Port Operations ---
    def add_port(self, code: str, name: str, city: str, country: str):
        props = {
            "code": code,
            "name": name,
            "city": city,
            "country": country,
            "label": "Port",
            "congestion_level": 10,
        }
        if self.use_neo4j:
            cypher = """
            MERGE (p:Port {code: $code})
            ON CREATE SET p += $props
            ON MATCH SET p += $props
            RETURN p
            """
            with self.driver.session() as session:
                session.run(cypher, code=code, props=props)
        else:
            self.nx_graph.add_node(code, **props)
            self._save_local_graph()

    # --- Route Operations ---
    def add_route(self, org_id: str, route_id: str, mode: str, origin_id: str, destination_id: str, avg_transit_days: int, cost_per_unit: int):
        props = {
            "node_id": route_id,
            "org_id": org_id,
            "label": "Route",
            "mode": mode,
            "origin_id": origin_id,
            "destination_id": destination_id,
            "avg_transit_days": avg_transit_days,
            "cost_per_unit": cost_per_unit,
            "current_risk_score": 0
        }
        if self.use_neo4j:
            # We add a Route node and relationships connecting origin and destination
            cypher = """
            MERGE (r:Route {node_id: $node_id, org_id: $org_id})
            ON CREATE SET r += $props
            ON MATCH SET r += $props
            WITH r
            MATCH (origin {node_id: $origin_id})
            MATCH (dest {node_id: $destination_id})
            MERGE (origin)-[:SHIPS_VIA]->(r)
            MERGE (r)-[:DELIVERS_TO]->(dest)
            RETURN r
            """
            with self.driver.session() as session:
                session.run(cypher, node_id=route_id, org_id=org_id, origin_id=origin_id, destination_id=destination_id, props=props)
        else:
            self.nx_graph.add_node(route_id, **props)
            # Add directed relationships
            self.nx_graph.add_edge(origin_id, route_id, type="SHIPS_VIA", org_id=org_id)
            self.nx_graph.add_edge(route_id, destination_id, type="DELIVERS_TO", org_id=org_id)
            self._save_local_graph()

    # --- Warehouse Operations ---
    def add_warehouse(self, org_id: str, warehouse_id: str, name: str, city: str, capacity_units: int, current_stock_units: int, daily_burn_rate: int):
        props = {
            "node_id": warehouse_id,
            "org_id": org_id,
            "label": "Warehouse",
            "name": name,
            "city": city,
            "capacity_units": capacity_units,
            "current_stock_units": current_stock_units,
            "daily_burn_rate": daily_burn_rate,
            "current_risk_score": 0
        }
        if self.use_neo4j:
            cypher = """
            MERGE (w:Warehouse {node_id: $node_id, org_id: $org_id})
            ON CREATE SET w += $props
            ON MATCH SET w += $props
            RETURN w
            """
            with self.driver.session() as session:
                session.run(cypher, node_id=warehouse_id, org_id=org_id, props=props)
        else:
            self.nx_graph.add_node(warehouse_id, **props)
            self._save_local_graph()

    # --- Customer Operations ---
    def add_customer(self, org_id: str, customer_id: str, name: str, city: str, contract_penalty_per_day_inr: int):
        props = {
            "node_id": customer_id,
            "org_id": org_id,
            "label": "Customer",
            "name": name,
            "city": city,
            "contract_penalty_per_day_inr": contract_penalty_per_day_inr,
        }
        if self.use_neo4j:
            cypher = """
            MERGE (c:Customer {node_id: $node_id, org_id: $org_id})
            ON CREATE SET c += $props
            ON MATCH SET c += $props
            RETURN c
            """
            with self.driver.session() as session:
                session.run(cypher, node_id=customer_id, org_id=org_id, props=props)
        else:
            self.nx_graph.add_node(customer_id, **props)
            self._save_local_graph()

    # Connect Warehouse -> Customer
    def link_warehouse_to_customer(self, org_id: str, warehouse_id: str, customer_id: str):
        if self.use_neo4j:
            cypher = """
            MATCH (w:Warehouse {node_id: $warehouse_id, org_id: $org_id})
            MATCH (c:Customer {node_id: $customer_id, org_id: $org_id})
            MERGE (w)-[:FULFILS]->(c)
            """
            with self.driver.session() as session:
                session.run(cypher, warehouse_id=warehouse_id, customer_id=customer_id, org_id=org_id)
        else:
            self.nx_graph.add_edge(warehouse_id, customer_id, type="FULFILS", org_id=org_id)
            self._save_local_graph()

    # Link alternate suppliers
    def link_alternate_supplier(self, org_id: str, primary_id: str, alternate_id: str):
        if self.use_neo4j:
            cypher = """
            MATCH (p:Supplier {node_id: $primary_id, org_id: $org_id})
            MATCH (a:Supplier {node_id: $alternate_id, org_id: $org_id})
            MERGE (p)-[:HAS_ALTERNATE]->(a)
            """
            with self.driver.session() as session:
                session.run(cypher, primary_id=primary_id, alternate_id=alternate_id, org_id=org_id)
        else:
            self.nx_graph.add_edge(primary_id, alternate_id, type="HAS_ALTERNATE", org_id=org_id)
            self._save_local_graph()

    # --- Order Operations ---
    def add_order(self, org_id: str, order_id: str, supplier_id: str, value_inr: int, units: int, required_by_date: str, status: str = "active"):
        props = {
            "order_id": order_id,
            "org_id": org_id,
            "label": "Order",
            "supplier_id": supplier_id,
            "value_inr": value_inr,
            "units": units,
            "required_by_date": required_by_date,
            "status": status
        }
        if self.use_neo4j:
            cypher = """
            MERGE (o:Order {order_id: $order_id, org_id: $org_id})
            ON CREATE SET o += $props
            ON MATCH SET o += $props
            WITH o
            MATCH (s:Supplier {node_id: $supplier_id, org_id: $org_id})
            MERGE (o)-[:SOURCED_FROM]->(s)
            RETURN o
            """
            with self.driver.session() as session:
                session.run(cypher, order_id=order_id, org_id=org_id, supplier_id=supplier_id, props=props)
        else:
            self.nx_graph.add_node(order_id, **props)
            self.nx_graph.add_edge(order_id, supplier_id, type="SOURCED_FROM", org_id=org_id)
            self._save_local_graph()

    # --- Update Risk Score ---
    def update_risk_score(self, org_id: str, node_id: str, risk_score: int):
        if self.use_neo4j:
            cypher = """
            MATCH (n {node_id: $node_id, org_id: $org_id})
            SET n.current_risk_score = $risk_score
            RETURN n
            """
            with self.driver.session() as session:
                session.run(cypher, node_id=node_id, org_id=org_id, risk_score=risk_score)
        else:
            if self.nx_graph.has_node(node_id):
                self.nx_graph.nodes[node_id]["current_risk_score"] = risk_score
                self._save_local_graph()

    # --- Get Full Graph (For UI Visualisation) ---
    def get_graph_data(self, org_id: str) -> Dict[str, Any]:
        if self.use_neo4j:
            # Traverses the graph and gets nodes/relationships
            cypher = """
            MATCH (n) WHERE n.org_id = $org_id OR n.label = 'Port'
            OPTIONAL MATCH (n)-[r]->(m) WHERE m.org_id = $org_id OR m.label = 'Port'
            RETURN n, r, m
            """
            nodes_map = {}
            links = []
            with self.driver.session() as session:
                result = session.run(cypher, org_id=org_id)
                for record in result:
                    n = record["n"]
                    if n:
                        n_id = n.get("node_id") or n.get("order_id") or n.get("code")
                        if n_id and n_id not in nodes_map:
                            nodes_map[n_id] = {
                                "id": n_id,
                                "label": list(n.labels)[0] if n.labels else "Unknown",
                                **dict(n)
                            }
                    m = record["m"]
                    if m:
                        m_id = m.get("node_id") or m.get("order_id") or m.get("code")
                        if m_id and m_id not in nodes_map:
                            nodes_map[m_id] = {
                                "id": m_id,
                                "label": list(m.labels)[0] if m.labels else "Unknown",
                                **dict(m)
                            }
                    r = record["r"]
                    if r and n and m:
                        n_id = n.get("node_id") or n.get("order_id") or n.get("code")
                        m_id = m.get("node_id") or m.get("order_id") or m.get("code")
                        links.append({
                            "source": n_id,
                            "target": m_id,
                            "type": r.type
                        })
            return {"nodes": list(nodes_map.values()), "links": links}
        else:
            nodes = []
            links = []
            for node_id, data in self.nx_graph.nodes(data=True):
                # Include organization nodes, plus Ports (global)
                if data.get("org_id") == org_id or data.get("label") == "Port":
                    nodes.append({
                        "id": node_id,
                        "label": data.get("label", "Unknown"),
                        **data
                    })
            for u, v, data in self.nx_graph.edges(data=True):
                # Verify both nodes belong to org / are global ports
                u_data = self.nx_graph.nodes[u]
                v_data = self.nx_graph.nodes[v]
                if (u_data.get("org_id") == org_id or u_data.get("label") == "Port") and \
                   (v_data.get("org_id") == org_id or v_data.get("label") == "Port"):
                    links.append({
                        "source": u,
                        "target": v,
                        "type": data.get("type", "UNKNOWN")
                    })
            return {"nodes": nodes, "links": links}

    # --- Traverse Disruption Impact ---
    def traverse_disruption_impact(self, org_id: str, target_node_id: str, severity: int) -> Tuple[List[Dict[str, Any]], List[Dict[str, Any]]]:
        """
        Traverse the supply chain downstream from the disrupted node.
        Find affected suppliers, routes, warehouses, customers, and active orders.
        """
        affected_nodes = []
        exposed_orders = []

        if self.use_neo4j:
            # Cypher traversal from target_node to find all downstream orders
            cypher_orders = """
            MATCH (disrupted {node_id: $target_node_id, org_id: $org_id})
            MATCH path = (disrupted)<-[:SOURCED_FROM|DELIVERS_TO|SHIPS_VIA|FULFILS*0..4]-(downstream)
            WHERE downstream:Order OR downstream:Warehouse OR downstream:Customer
            RETURN downstream, labels(downstream) as labels
            """
            with self.driver.session() as session:
                result = session.run(cypher_orders, target_node_id=target_node_id, org_id=org_id)
                for record in result:
                    node = record["downstream"]
                    labels = record["labels"]
                    node_data = dict(node)
                    if "Order" in labels:
                        if node_data.get("status") == "active":
                            exposed_orders.append(node_data)
                    else:
                        affected_nodes.append({
                            "id": node_data.get("node_id"),
                            "label": labels[0] if labels else "Unknown",
                            **node_data
                        })
            
            # Add target disrupted node itself to affected list
            cypher_target = "MATCH (n {node_id: $target_node_id, org_id: $org_id}) RETURN n"
            with self.driver.session() as session:
                res = session.run(cypher_target, target_node_id=target_node_id, org_id=org_id)
                record = res.single()
                if record:
                    affected_nodes.append({
                        "id": target_node_id,
                        "label": "Supplier",
                        **dict(record["n"])
                    })
            
            # Deduplicate lists
            affected_nodes = {n["id"]: n for n in affected_nodes if n.get("id")}.values()
            exposed_orders = {o["order_id"]: o for o in exposed_orders if o.get("order_id")}.values()

            return list(affected_nodes), list(exposed_orders)
        else:
            # Local networkx traversal: search in backwards direction since relations are
            # Order -> Sourced_from -> Supplier -> Ships_via -> Route -> Delivers_to -> Warehouse -> Fulfils -> Customer
            # So, to find affected downstream elements from Supplier, we must traverse UP the edges (i.e. traverse reverse graph).
            if not self.nx_graph.has_node(target_node_id):
                return [], []

            rev_graph = self.nx_graph.reverse(copy=True)
            # Find reachable nodes using BFS/DFS
            reachable = nx.descendants(rev_graph, target_node_id)
            reachable.add(target_node_id)

            for nid in reachable:
                node_data = self.nx_graph.nodes[nid]
                if node_data.get("org_id") == org_id:
                    lbl = node_data.get("label")
                    if lbl == "Order":
                        if node_data.get("status") == "active":
                            exposed_orders.append(node_data)
                    else:
                        affected_nodes.append({
                            "id": nid,
                            "label": lbl,
                            **node_data
                        })

            return affected_nodes, exposed_orders

    def clear_organisation_graph(self, org_id: str):
        """Clears all nodes and relationships associated with the given organization ID."""
        if self.use_neo4j:
            cypher = "MATCH (n) WHERE n.org_id = $org_id DETACH DELETE n"
            with self.driver.session() as session:
                session.run(cypher, org_id=org_id)
        else:
            to_remove = [node_id for node_id, data in self.nx_graph.nodes(data=True) if data.get("org_id") == org_id]
            for node_id in to_remove:
                self.nx_graph.remove_node(node_id)
            self._save_local_graph()
            
graph_service = GraphService()

