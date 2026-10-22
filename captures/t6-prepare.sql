if object_id('nums') is null
begin
  create table nums (n int not null)
end
go
truncate table nums
go
declare @i int
select @i = 1
while @i <= 10000 begin insert nums values (@i) select @i = @i + 1 end
go
select count(*) from nums
go
