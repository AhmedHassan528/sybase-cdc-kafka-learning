use master
go
disk init name = 'phoenix_data', physname = '/opt/sybase/data/phoenix_data.dat', size = '1G'
go
disk init name = 'phoenix_log',  physname = '/opt/sybase/data/phoenix_log.dat',  size = '512M'
go
create database phoenix_test on phoenix_data = '1G' log on phoenix_log = '512M'
go
exec sp_dboption phoenix_test, 'select into', true
go
exec sp_dboption phoenix_test, 'ddl in tran', true
go
-- 'trunc log on chkpt' lets the log be truncated up to the RepAgent secondary truncation point
exec sp_dboption phoenix_test, 'trunc log on chkpt', true
go
