-- Alert when the replication truncation point holds the log: fires when free log pages < 24576 (75% of 32768).
-- Only records and prints an alert; it never truncates the log.
use phoenix_test
go
if object_id('cdc_log_alert') is null
  create table cdc_log_alert (fired_at datetime default getdate(), dbname varchar(30), segment varchar(30), free_pages int)
go
if object_id('sp_cdc_log_alert') is not null drop procedure sp_cdc_log_alert
go
create procedure sp_cdc_log_alert @dbname varchar(30), @segmentname varchar(30), @space_left int, @status int
as
  insert cdc_log_alert (dbname, segment, free_pages) values (@dbname, @segmentname, @space_left)
  print 'CDC ALERT: %1! %2! below %3! free pages - check the CDC connector / RepAgent (secondary truncation point)', @dbname, @segmentname, @space_left
go
if not exists (select 1 from systhresholds where segment = 2 and free_space = 24576)
  exec sp_addthreshold phoenix_test, logsegment, 24576, sp_cdc_log_alert
go
sp_helpthreshold
go
