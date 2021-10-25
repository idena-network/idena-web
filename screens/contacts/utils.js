import {IdentityStatus} from '../../shared/types'

export const canKill = (invitee, identity) =>
  identity?.state === IdentityStatus.Invite ||
  (Boolean(invitee) &&
    [IdentityStatus.Newbie, IdentityStatus.Candidate].includes(identity?.state))
