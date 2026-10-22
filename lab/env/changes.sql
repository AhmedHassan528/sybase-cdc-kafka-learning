-- Scripted changes: one insert, one update, one delete on payment. Run with lab/env/changes.sh.
insert into payment (account_no, amount, currency) values ('ACC-1001', 125.50, 'EUR')
go
insert into payment (account_no, amount, currency) values ('ACC-1002', 80.00, 'USD')
go
update payment set amount = 130.00 where account_no = 'ACC-1001'
go
delete from payment where account_no = 'ACC-1002'
go
select payment_id, account_no, amount, currency from payment order by payment_id
go
