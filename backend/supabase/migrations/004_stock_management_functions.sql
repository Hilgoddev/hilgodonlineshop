-- Atomically decrement product stock.
-- Returns TRUE if the decrement succeeded (sufficient stock existed),
-- FALSE if stock was insufficient (no rows updated).
CREATE OR REPLACE FUNCTION decrement_product_stock(p_product_id uuid, p_quantity int)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  updated_rows int;
BEGIN
  UPDATE products
  SET stock = stock - p_quantity
  WHERE id = p_product_id AND stock >= p_quantity;

  GET DIAGNOSTICS updated_rows = ROW_COUNT;
  RETURN updated_rows > 0;
END;
$$;

-- Restore stock (used when an order is cancelled after stock was decremented).
CREATE OR REPLACE FUNCTION increment_product_stock(p_product_id uuid, p_quantity int)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE products SET stock = stock + p_quantity WHERE id = p_product_id;
END;
$$;
