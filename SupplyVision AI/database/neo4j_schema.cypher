// SupplyVision AI - Neo4j Graph Constraints & Schema

// Constraints to guarantee unique IDs for each entity types per organisation
CREATE CONSTRAINT unique_supplier_id IF NOT EXISTS
FOR (s:Supplier) REQUIRE s.node_id IS UNIQUE;

CREATE CONSTRAINT unique_port_code IF NOT EXISTS
FOR (p:Port) REQUIRE p.code IS UNIQUE;

CREATE CONSTRAINT unique_route_id IF NOT EXISTS
FOR (r:Route) REQUIRE r.node_id IS UNIQUE;

CREATE CONSTRAINT unique_warehouse_id IF NOT EXISTS
FOR (w:Warehouse) REQUIRE w.node_id IS UNIQUE;

CREATE CONSTRAINT unique_order_id IF NOT EXISTS
FOR (o:Order) REQUIRE o.order_id IS UNIQUE;

CREATE CONSTRAINT unique_customer_id IF NOT EXISTS
FOR (c:Customer) REQUIRE c.node_id IS UNIQUE;

// Indexes for fast lookup by org_id for multi-tenancy
CREATE INDEX supplier_org_idx IF NOT EXISTS
FOR (s:Supplier) ON (s.org_id);

CREATE INDEX route_org_idx IF NOT EXISTS
FOR (r:Route) ON (r.org_id);

CREATE INDEX warehouse_org_idx IF NOT EXISTS
FOR (w:Warehouse) ON (w.org_id);

CREATE INDEX order_org_idx IF NOT EXISTS
FOR (o:Order) ON (o.org_id);

CREATE INDEX customer_org_idx IF NOT EXISTS
FOR (c:Customer) ON (c.org_id);
