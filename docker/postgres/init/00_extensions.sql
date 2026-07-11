-- Kích hoạt các extension cần thiết cho dự án
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "postgis";
CREATE EXTENSION IF NOT EXISTS "ltree";

-- PL/pgSQL helper để generate UUIDv7 cho các scripts seed/migration tại DB:
CREATE OR REPLACE FUNCTION uuid_generate_v7()
RETURNS uuid AS $$
DECLARE
  unix_time_ms bytea;
  uuid_bytes bytea;
BEGIN
  -- Lấy timestamp hiện tại (miliseconds)
  unix_time_ms := substring(decode(lpad(to_hex(floor(extract(epoch from clock_timestamp()) * 1000)::bigint), 16, '0'), 'hex') from 3 for 6);
  
  -- Generate 10 bytes random
  uuid_bytes := unix_time_ms || gen_random_bytes(10);
  
  -- Set phiên bản (version 7) -> 4 bits đầu của byte thứ 7 là 0111 (0x70)
  uuid_bytes := set_byte(uuid_bytes, 6, (get_byte(uuid_bytes, 6) & 15) | 112);
  
  -- Set biến thể (variant 1) -> 2 bits đầu của byte thứ 9 là 10 (0x80)
  uuid_bytes := set_byte(uuid_bytes, 8, (get_byte(uuid_bytes, 8) & 63) | 128);
  
  RETURN encode(uuid_bytes, 'hex')::uuid;
END;
$$ LANGUAGE plpgsql VOLATILE;
