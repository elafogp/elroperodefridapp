---
name: DB Schema columns
description: Exact column names for each Supabase table discovered via API probing
type: reference
---
productos: id, sku, nombre, categoria, subcategoria, costo_usd, precio, stock, fotos(jsonb), created_at
product_variations: id, product_id, size, color, stock, created_at
clientes: id, name, cedula, phone, instagram, notes, created_at
transacciones: id, tipo, items(jsonb), cliente_id, metodo_pago, split_payment(jsonb), total_usd, total_local, tasa_usada, descuento, seller_id, seller_name, notas, origen, fulfillment, voided, return_reason, created_at
gastos: id, descripcion, fecha, monto, categoria
caja_chica: id, tipo, monto, descripcion, fecha, created_at
apartados: id, transaccion_id, cliente_id, items(jsonb), total_usd, first_payment, second_payment, status, expires_at, completed_at, created_at
pickups: id, transaccion_id, cliente_id, customer_name, items(jsonb), estado, notas, delivered_at, created_at
inversiones: id, descripcion, fecha, monto
proveedores: id, nombre, contacto
salarios: id, monto
tasas_cambio: id, fecha, valor, created_at
