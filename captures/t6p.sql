-- ONE transaction of 200,000 rows (20 x 10,000 from a cross join)
insert payment (account_no, amount, currency)
  select 'T6P-' + convert(varchar(10), a.n * 100000 + b.n), b.n, 'EGP'
  from nums a, nums b where a.n <= 20
go
