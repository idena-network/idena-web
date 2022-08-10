export function transactionType(tx) {
  const {type} = tx
  const {data} = tx
  if (type === 'SendTx') return 'Transfer'
  if (type === 'ActivationTx') return 'Invitation activated'
  if (type === 'InviteTx') return 'Invitation issued'
  if (type === 'KillInviteeTx') return 'Invitation terminated'
  if (type === 'KillTx') return 'Identity terminated'
  if (type === 'SubmitFlipTx') return 'Flip submitted'
  if (type === 'DelegateTx') return 'Delegatee added'
  if (type === 'UndelegateTx') return 'Delegatee removed'
  if (type === 'OnlineStatusTx')
    return `Mining status ${data && data.becomeOnline ? 'On' : 'Off'}`
  return type
}

export const isAddress = address =>
  address && address.length === 42 && address.substr(0, 2) === '0x'
