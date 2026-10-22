-- 100 transactions x 10,000 rows = 1,000,000 rows
declare @b int
select @b = 0
while @b < 100
begin
  insert payment (account_no, amount, currency)
    select 'T6-' + convert(varchar(10), @b * 10000 + n), n + 0.25, 'EGP' from nums
  select @b = @b + 1
end
go
