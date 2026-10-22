declare @i int
select @i = 1
while @i <= 20000
begin
  insert payment(account_no, amount, currency) values ('T6S-' + convert(varchar(10), @i), @i, 'EGP')
  select @i = @i + 1
end
go
