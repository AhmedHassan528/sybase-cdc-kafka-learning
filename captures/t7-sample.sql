select convert(char(8),getdate(),108), lct_admin('logsegment_freepages', db_id('phoenix_test')), (select count(*) from cdc_log_alert), (select count(*) from master..sysprocesses where blocked>0 or status like '%sleep%' and cmd like '%LOG SUSPEND%'), (select page from master..syslogshold where name like '%replication_truncation%')
go
