use master
go
create login cdc_repl_test with password 'Repl_Test_2026' default database phoenix_test
go
grant role replication_role to cdc_repl_test
go
create login cdc_app_test with password 'App_Test_2026' default database phoenix_test
go
use phoenix_test
go
sp_adduser cdc_repl_test
go
sp_adduser cdc_app_test
go
grant select, insert, update, delete on payment to cdc_app_test
go
