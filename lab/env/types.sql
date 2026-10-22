-- One column per common ASE type: a full row, an all-NULL row, and an update. Run with lab/experiments/data-types.sh.
if object_id('ltl_types') is not null drop table ltl_types
go
create table ltl_types (
  id        int not null primary key,
  c_tiny    tinyint null, c_small smallint null, c_big bigint null, c_bit bit default 0 not null,
  c_num     numeric(18,4) null, c_dec decimal(10,0) null, c_money money null, c_smoney smallmoney null,
  c_float   float null, c_real real null,
  c_char    char(10) null, c_vchar varchar(200) null, c_uvchar univarchar(100) null,
  c_dt      datetime null, c_sdt smalldatetime null, c_date date null, c_time time null, c_bdt bigdatetime null,
  c_bin     binary(4) null, c_vbin varbinary(300) null)
go
sp_setreptable ltl_types, true
go
grant select, insert, update, delete on ltl_types to cdc_app
go
