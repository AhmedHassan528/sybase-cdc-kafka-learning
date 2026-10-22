use phoenix_test
go
select suser_name(), user_name(), show_role()
go
sp_help_rep_agent phoenix_test, 'process'
go
sp_config_rep_agent phoenix_test, 'scan timeout', '15'
go
sp_setreptable payment
go
