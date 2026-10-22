use phoenix_test
go
sp_dropuser cdc_repl_test
go
sp_dropuser cdc_app_test
go
use master
go
drop login cdc_repl_test
go
drop login cdc_app_test
go
select name from master..syslogins
go
