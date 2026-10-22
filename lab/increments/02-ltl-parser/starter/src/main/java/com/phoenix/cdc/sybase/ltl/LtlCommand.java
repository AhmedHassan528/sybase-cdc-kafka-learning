package com.phoenix.cdc.sybase.ltl;

import java.util.List;
import java.util.Map;

/**
 * One parsed LTL "distribute" command (LTL 760, ASE 16 RepAgent).
 *
 * <pre>
 * distribute 1 ~*6&lt;origin_time&gt;,4 0x&lt;oqid&gt;,6 0x&lt;tran_id&gt; begin transaction ~"+tran_name for ~"#sa-... osid 14
 * distribute ... applied owner =~"$dbo ~"(payment.~!*rs_insert yielding after ~G+payment_id=~0"1,~$+account_no=...
 * distribute ... applied ... .~!*rs_update yielding before &lt;all columns&gt; after &lt;changed columns&gt;
 * distribute ... applied ... .~!*rs_delete yielding before &lt;all columns&gt;
 * distribute ... commit transaction | rollback transaction
 * </pre>
 *
 * For updates, {@code after} is already merged with {@code before}, so it is the full new row.
 * {@code keyColumns} are the columns RepAgent flags as primary key.
 */
public record LtlCommand(
        Kind kind,
        String originTime,
        byte[] oqid,
        byte[] tranId,
        String owner,
        String table,
        Map<String, Object> before,
        Map<String, Object> after,
        List<String> keyColumns,
        String tranName,
        String user,
        String raw) {

    public enum Kind { BEGIN, COMMIT, ROLLBACK, INSERT, UPDATE, DELETE, OTHER }

    public boolean isRowChange() {
        return kind == Kind.INSERT || kind == Kind.UPDATE || kind == Kind.DELETE;
    }
}
