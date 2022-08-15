import {IdentityStatus} from '../../shared/types'

export const canKill = (invitee, identity) =>
  identity?.state === IdentityStatus.Invite ||
  (Boolean(invitee) && identity?.state === IdentityStatus.Candidate)
