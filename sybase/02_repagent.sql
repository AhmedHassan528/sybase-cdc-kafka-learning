-- Point RepAgent at our connector (CDC_RS -> connect:11752 in the interfaces file).
-- 'enable' also establishes the secondary (LTM) truncation point; the log is now held
-- until RepAgent has delivered it. Do NOT start the RepAgent until the connector listens.
use phoenix_test
go
sp_config_rep_agent phoenix_test, 'enable', 'CDC_RS', 'rs_user', 'rs_password'
go
sp_help_rep_agent phoenix_test, 'process'
go
-- Our connector checks the plain TDS login password. With 'net password encryption' = true (default)
-- RepAgent expects the RSA challenge/response login instead. See GUIDE.md "Security".
sp_config_rep_agent phoenix_test, 'net password encryption', 'false'
go
