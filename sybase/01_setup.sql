-- Run as sa. Creates phoenix_test, the payment table, and marks it for replication.
sp_configure 'enable rep agent threads', 1
go
use phoenix_test
go
if object_id('payment') is null
create table payment (
  payment_id numeric(18,0) identity primary key,
  account_no varchar(30) not null,
  amount     numeric(18,2) not null,
  currency   char(3) not null,
  created_at datetime default getdate())
go
sp_setreptable payment, true
go
select @@version
go
