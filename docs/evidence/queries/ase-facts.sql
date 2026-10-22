select @@version
go
select @@servername, @@pagesize as page_size_bytes
go
sp_lmconfig
go
sp_configure 'enable rep agent threads'
go
use phoenix_test
go
sp_helpdb phoenix_test
go
sp_config_rep_agent phoenix_test
go
sp_help_rep_agent phoenix_test, 'process'
go
dbcc gettrunc
go
select name, page from master..syslogshold
go
sp_setreptable
go
sp_helpthreshold
go
select name from master..syslogins
go
