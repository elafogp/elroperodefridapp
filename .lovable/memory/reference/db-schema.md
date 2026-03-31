---
name: DB Schema columns
description: Exact column names for each Supabase table discovered via API probing
type: reference
---
productos: id, nombre, descripcion, precio, stock, created_at
product_variations: id, product_id, size, color, stock, created_at
clientes: id, name, cedula, phone, instagram, notes, created_at
transacciones: id, items(jsonb), cliente_id, metodo_pago, total_usd, total_local, tasa_usada, created_at
gastos: id, descripcion, fecha, monto
caja_chica: id, tipo, monto, descripcion, fecha, created_at
apartados: id, cliente_id
pickups: id, transaccion_id, estado
inversiones: id, descripcion, fecha, monto
proveedores: id, nombre, contacto
salarios: id, monto
tasas_cambio: id, fecha, valor, created_at
