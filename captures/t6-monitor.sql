select convert(char(8), getdate(), 108),
  (select count(*) from master..sysprocesses where blocked > 0),
  (select count(*) from master..syslocks where dbid = db_id('phoenix_test')),
  lct_admin('logsegment_freepages', db_id('phoenix_test')),
  (select page from master..syslogshold where dbid = db_id('phoenix_test') and name = '$replication_truncation_point')
go
