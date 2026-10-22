use phoenix_test
go
select suser_name(), user_name(), show_role()
go
insert payment (account_no, amount, currency) values ('PRIV-TEST', 1.00, 'EGP')
go
sp_help_rep_agent phoenix_test, 'process'
go
