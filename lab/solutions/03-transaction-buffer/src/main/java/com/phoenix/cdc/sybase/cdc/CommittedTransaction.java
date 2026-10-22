package com.phoenix.cdc.sybase.cdc;

import com.phoenix.cdc.sybase.ltl.LtlCommand;

import java.util.List;

/**
 * A transaction RepAgent reported as committed, with its row changes in log order.
 *
 * @param tranId     ASE transaction id (hex)
 * @param commitOqid origin queue ID of the commit record: our position in the log
 * @param commitTime origin_time of the commit record, as sent by RepAgent
 * @param user       login that ran the transaction (from "begin transaction ... for 'user'")
 * @param changes    INSERT/UPDATE/DELETE commands, in the order they were logged
 */
public record CommittedTransaction(
        String tranId,
        byte[] commitOqid,
        String commitTime,
        String user,
        List<LtlCommand> changes) {
}
