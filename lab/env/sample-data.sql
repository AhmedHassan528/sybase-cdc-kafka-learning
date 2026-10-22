-- Second sample table for the "multiple tables" section. Run with lab/env/sample-data.sh.
-- The payment table already exists (sybase/01_setup.sql).
if object_id('customer') is null
create table customer (
  customer_id numeric(18,0) identity primary key,
  full_name   varchar(60) not null,
  country     char(2) not null,
  created_at  datetime default getdate())
go
sp_setreptable customer, true
go
grant select, insert, update, delete on customer to cdc_app
go
