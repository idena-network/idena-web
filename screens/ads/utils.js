/* eslint-disable no-use-before-define */
import protobuf from 'protobufjs'
import {
  areSameCaseInsensitive,
  callRpc,
  HASH_IN_MEMPOOL,
} from '../../shared/utils/utils'
import {hexToObject} from '../oracles/utils'
import {AdStatus, AdVotingOption, AdVotingOptionId} from './types'
import {VotingStatus} from '../../shared/types'

export async function buildAdKeyHex({language, age, stake, os = currentOs()}) {
  const AdKeyType = (
    await protobuf.load('/static/pb/profile.proto')
  ).lookupType('profile.AdKey')

  const adKeyMessage = AdKeyType.create({
    language,
    age,
    stake,
    os,
  })

  const encodedAdKey = AdKeyType.encode(adKeyMessage).finish()

  return Buffer.from(encodedAdKey).toString('hex')
}

export async function buildProfileHex(ads) {
  const ProfileType = (
    await protobuf.load('/static/pb/profile.proto')
  ).lookupType('profile.Profile')

  const profileMessage = ProfileType.create({ads})

  const encodedProfile = ProfileType.encode(profileMessage).finish()

  return Buffer.from(encodedProfile).toString('hex')
}

export async function fetchProfileAds(address) {
  try {
    const {profileHash: profileCid} = await callRpc('dna_identity', address)

    if (!profileCid) return []

    const profileHex = await callRpc('ipfs_get', profileCid)

    const ProfileType = (
      await protobuf.load('/static/pb/profile.proto')
    ).lookupType('profile.Profile')

    const {ads} = ProfileType.decode(Buffer.from(profileHex.slice(2), 'hex'))

    return ads
  } catch {
    console.error('Error fetching ads for identity', address)
    return []
  }
}

export async function fetchProfileAd(cid) {
  const adHex = await callRpc('ipfs_get', cid)

  if (adHex) {
    const AdContentType = (
      await protobuf.load('/static/pb/profile.proto')
    ).lookupType('profile.AdContent')

    return AdContentType.decode(Buffer.from(adHex.slice(2), 'hex'))
  }

  return null
}

export const buildAdReviewVoting = ({title, adCid}) => ({
  title: 'Is this ads propriate?',
  desc: `title: ${title}, cid: ${adCid}`,
  adCid,
  // votingDuration: 4320 * 3,
  // publicVotingDuration: 2160,
  votingDuration: 3 * 3,
  publicVotingDuration: 3 * 3,
  winnerThreshold: 66,
  quorum: 1,
  committeeSize: 100,
  options: [
    buildAdReviewVotingOption(AdVotingOption.Approve),
    buildAdReviewVotingOption(AdVotingOption.Reject),
  ],
  ownerFee: 100,
  shouldStartImmediately: true,
  isFreeVoting: true,
})

const buildAdReviewVotingOption = option => ({
  id: AdVotingOptionId[option],
  value: option,
})

export const weakTargetField = (field, targetField, condition) =>
  field ? condition(field, targetField) : true

export const isRelevantAd = (
  {language: adLanguage, os: adOS, age: adAge, stake: adStake},
  {language: targetLanguage, os: targetOS, age: targetAge, stake: targetStake}
) =>
  weakTargetField(adLanguage, targetLanguage, areSameCaseInsensitive) &&
  weakTargetField(adOS, targetOS, areSameCaseInsensitive) &&
  weakTargetField(
    adAge,
    targetAge,
    // eslint-disable-next-line no-shadow
    (adAge, targetAge) => Number(targetAge) >= Number(adAge)
  ) &&
  weakTargetField(
    adStake,
    targetStake,
    // eslint-disable-next-line no-shadow
    (adStake, targetStake) => Number(targetStake) >= Number(adStake)
  )

export const OS = {
  Windows: 'windows',
  macOS: 'macos',
  Linux: 'linux',
  iOS: 'ios',
  Android: 'android',
}

export function currentOs() {
  switch (true) {
    case /Android/.test(navigator.userAgent):
      return OS.Android
    case /iPhone|iPad|iPod/.test(navigator.userAgent):
      return OS.iOS
    case /Win/.test(navigator.userAgent):
      return OS.Windows
    case /Mac/.test(navigator.userAgent):
      return OS.macOS
    case /Linux/.test(navigator.userAgent):
      return OS.Linux
    default:
      return null
  }
}

const eitherStatus = (...statuses) => status =>
  statuses.some(s => s.toUpperCase() === status.toUpperCase())

export const isReviewingAd = ({status}) =>
  eitherStatus(
    AdStatus.Reviewing,
    VotingStatus.Pending,
    VotingStatus.Open,
    VotingStatus.Voted,
    VotingStatus.Counting
  )(status)

export const isActiveAd = ({status}) =>
  eitherStatus(
    AdStatus.Reviewing,
    VotingStatus.Pending,
    VotingStatus.Open,
    VotingStatus.Voted,
    VotingStatus.Counting
  )(status)

export const isApprovedAd = ({status}) =>
  eitherStatus(
    AdStatus.Showing,
    AdStatus.NotShowing,
    AdStatus.PartiallyShowing
  )(status)

export function pollTx(txHash, cb) {
  let timeoutId

  const fetchStatus = async () => {
    try {
      const {blockHash} = await callRpc('bcn_transaction', txHash)

      if (blockHash === HASH_IN_MEMPOOL) {
        timeoutId = setTimeout(fetchStatus, 10 * 1000)
      } else {
        cb({type: 'MINED'})
      }
    } catch (error) {
      cb('TX_NULL', {data: {message: 'Transaction does not exist'}})
    }
  }

  timeoutId = setTimeout(fetchStatus, 10 * 1000)

  return () => {
    clearTimeout(timeoutId)
  }
}

export function pollContractTx(txHash, cb) {
  let timeoutId

  const fetchStatus = async () => {
    try {
      const {blockHash} = await callRpc('bcn_transaction', txHash)

      if (blockHash === HASH_IN_MEMPOOL) {
        timeoutId = setTimeout(fetchStatus, 10 * 1000)
      } else {
        const {success, error} = await callRpc('bcn_txReceipt', txHash)

        if (success) cb({type: 'MINED'})
        else if (error) cb({type: 'MINING_FAILED'})
        else timeoutId = setTimeout(fetchStatus, 10 * 1000)
      }
    } catch (error) {
      cb('TX_NULL', {data: {message: 'Transaction does not exist'}})
    }
  }

  timeoutId = setTimeout(fetchStatus, 10 * 1000)

  return () => {
    clearTimeout(timeoutId)
  }
}

export function filterAdsByStatus(ads, filter) {
  return ads.filter(({status}) =>
    // eslint-disable-next-line no-nested-ternary
    filter === AdStatus.Reviewing
      ? isReviewingAd({status})
      : filter === AdStatus.Active
      ? isApprovedAd({status})
      : areSameCaseInsensitive(status, filter)
  )
}

export const isClosedVoting = maybeVoting =>
  eitherStatus(
    VotingStatus.Archived,
    VotingStatus.Terminated
  )(maybeVoting.status ?? maybeVoting)

export const isApprovedVoting = ({result, ...voting}) =>
  isClosedVoting(voting)
    ? result === AdVotingOptionId[AdVotingOption.Approve]
    : false

export const countryCodes = [
  {name: `Afghanistan`, code: 'AF', code3: 'AFG', numeric: '004'},
  {name: `Albania`, code: 'AL', code3: 'ALB', numeric: '008'},
  {name: `Algeria`, code: 'DZ', code3: 'DZA', numeric: '012'},
  {name: `American Samoa`, code: 'AS', code3: 'ASM', numeric: '016'},
  {name: `Andorra`, code: 'AD', code3: 'AND', numeric: '020'},
  {name: `Angola`, code: 'AO', code3: 'AGO', numeric: '024'},
  {name: `Anguilla`, code: 'AI', code3: 'AIA', numeric: '660'},
  {name: `Antarctica`, code: 'AQ', code3: 'ATA', numeric: '010'},
  {name: `Antigua and Barbuda`, code: 'AG', code3: 'ATG', numeric: '028'},
  {name: `Argentina`, code: 'AR', code3: 'ARG', numeric: '032'},
  {name: `Armenia`, code: 'AM', code3: 'ARM', numeric: '051'},
  {name: `Aruba`, code: 'AW', code3: 'ABW', numeric: '533'},
  {name: `Australia`, code: 'AU', code3: 'AUS', numeric: '036'},
  {name: `Austria`, code: 'AT', code3: 'AUT', numeric: '040'},
  {name: `Azerbaijan`, code: 'AZ', code3: 'AZE', numeric: '031'},
  {name: `Bahamas (the)`, code: 'BS', code3: 'BHS', numeric: '044'},
  {name: `Bahrain`, code: 'BH', code3: 'BHR', numeric: '048'},
  {name: `Bangladesh`, code: 'BD', code3: 'BGD', numeric: '050'},
  {name: `Barbados`, code: 'BB', code3: 'BRB', numeric: '052'},
  {name: `Belarus`, code: 'BY', code3: 'BLR', numeric: '112'},
  {name: `Belgium`, code: 'BE', code3: 'BEL', numeric: '056'},
  {name: `Belize`, code: 'BZ', code3: 'BLZ', numeric: '084'},
  {name: `Benin`, code: 'BJ', code3: 'BEN', numeric: '204'},
  {name: `Bermuda`, code: 'BM', code3: 'BMU', numeric: '060'},
  {name: `Bhutan`, code: 'BT', code3: 'BTN', numeric: '064'},
  {
    name: `Bolivia (Plurinational State of)`,
    code: 'BO',
    code3: 'BOL',
    numeric: '068',
  },
  {
    name: `Bonaire, Sint Eustatius and Saba`,
    code: 'BQ',
    code3: 'BES',
    numeric: '535',
  },
  {name: `Bosnia and Herzegovina`, code: 'BA', code3: 'BIH', numeric: '070'},
  {name: `Botswana`, code: 'BW', code3: 'BWA', numeric: '072'},
  {name: `Bouvet Island`, code: 'BV', code3: 'BVT', numeric: '074'},
  {name: `Brazil`, code: 'BR', code3: 'BRA', numeric: '076'},
  {
    name: `British Indian Ocean Territory (the)`,
    code: 'IO',
    code3: 'IOT',
    numeric: '086',
  },
  {name: `Brunei Darussalam`, code: 'BN', code3: 'BRN', numeric: '096'},
  {name: `Bulgaria`, code: 'BG', code3: 'BGR', numeric: '100'},
  {name: `Burkina Faso`, code: 'BF', code3: 'BFA', numeric: '854'},
  {name: `Burundi`, code: 'BI', code3: 'BDI', numeric: '108'},
  {name: `Cabo Verde`, code: 'CV', code3: 'CPV', numeric: '132'},
  {name: `Cambodia`, code: 'KH', code3: 'KHM', numeric: '116'},
  {name: `Cameroon`, code: 'CM', code3: 'CMR', numeric: '120'},
  {name: `Canada`, code: 'CA', code3: 'CAN', numeric: '124'},
  {name: `Cayman Islands (the)`, code: 'KY', code3: 'CYM', numeric: '136'},
  {
    name: `Central African Republic (the)`,
    code: 'CF',
    code3: 'CAF',
    numeric: '140',
  },
  {name: `Chad`, code: 'TD', code3: 'TCD', numeric: '148'},
  {name: `Chile`, code: 'CL', code3: 'CHL', numeric: '152'},
  {name: `China`, code: 'CN', code3: 'CHN', numeric: '156'},
  {name: `Christmas Island`, code: 'CX', code3: 'CXR', numeric: '162'},
  {
    name: `Cocos (Keeling) Islands (the)`,
    code: 'CC',
    code3: 'CCK',
    numeric: '166',
  },
  {name: `Colombia`, code: 'CO', code3: 'COL', numeric: '170'},
  {name: `Comoros (the)`, code: 'KM', code3: 'COM', numeric: '174'},
  {
    name: `Congo (the Democratic Republic of the)`,
    code: 'CD',
    code3: 'COD',
    numeric: '180',
  },
  {name: `Congo (the)`, code: 'CG', code3: 'COG', numeric: '178'},
  {name: `Cook Islands (the)`, code: 'CK', code3: 'COK', numeric: '184'},
  {name: `Costa Rica`, code: 'CR', code3: 'CRI', numeric: '188'},
  {name: `Croatia`, code: 'HR', code3: 'HRV', numeric: '191'},
  {name: `Cuba`, code: 'CU', code3: 'CUB', numeric: '192'},
  {name: `Curaçao`, code: 'CW', code3: 'CUW', numeric: '531'},
  {name: `Cyprus`, code: 'CY', code3: 'CYP', numeric: '196'},
  {name: `Czechia`, code: 'CZ', code3: 'CZE', numeric: '203'},
  {name: `Côte d'Ivoire`, code: 'CI', code3: 'CIV', numeric: '384'},
  {name: `Denmark`, code: 'DK', code3: 'DNK', numeric: '208'},
  {name: `Djibouti`, code: 'DJ', code3: 'DJI', numeric: '262'},
  {name: `Dominica`, code: 'DM', code3: 'DMA', numeric: '212'},
  {
    name: `Dominican Republic (the)`,
    code: 'DO',
    code3: 'DOM',
    numeric: '214',
  },
  {name: `Ecuador`, code: 'EC', code3: 'ECU', numeric: '218'},
  {name: `Egypt`, code: 'EG', code3: 'EGY', numeric: '818'},
  {name: `El Salvador`, code: 'SV', code3: 'SLV', numeric: '222'},
  {name: `Equatorial Guinea`, code: 'GQ', code3: 'GNQ', numeric: '226'},
  {name: `Eritrea`, code: 'ER', code3: 'ERI', numeric: '232'},
  {name: `Estonia`, code: 'EE', code3: 'EST', numeric: '233'},
  {name: `Eswatini`, code: 'SZ', code3: 'SWZ', numeric: '748'},
  {name: `Ethiopia`, code: 'ET', code3: 'ETH', numeric: '231'},
  {
    name: `Falkland Islands (the) [Malvinas]`,
    code: 'FK',
    code3: 'FLK',
    numeric: '238',
  },
  {name: `Faroe Islands (the)`, code: 'FO', code3: 'FRO', numeric: '234'},
  {name: `Fiji`, code: 'FJ', code3: 'FJI', numeric: '242'},
  {name: `Finland`, code: 'FI', code3: 'FIN', numeric: '246'},
  {name: `France`, code: 'FR', code3: 'FRA', numeric: '250'},
  {name: `French Guiana`, code: 'GF', code3: 'GUF', numeric: '254'},
  {name: `French Polynesia`, code: 'PF', code3: 'PYF', numeric: '258'},
  {
    name: `French Southern Territories (the)`,
    code: 'TF',
    code3: 'ATF',
    numeric: '260',
  },
  {name: `Gabon`, code: 'GA', code3: 'GAB', numeric: '266'},
  {name: `Gambia (the)`, code: 'GM', code3: 'GMB', numeric: '270'},
  {name: `Georgia`, code: 'GE', code3: 'GEO', numeric: '268'},
  {name: `Germany`, code: 'DE', code3: 'DEU', numeric: '276'},
  {name: `Ghana`, code: 'GH', code3: 'GHA', numeric: '288'},
  {name: `Gibraltar`, code: 'GI', code3: 'GIB', numeric: '292'},
  {name: `Greece`, code: 'GR', code3: 'GRC', numeric: '300'},
  {name: `Greenland`, code: 'GL', code3: 'GRL', numeric: '304'},
  {name: `Grenada`, code: 'GD', code3: 'GRD', numeric: '308'},
  {name: `Guadeloupe`, code: 'GP', code3: 'GLP', numeric: '312'},
  {name: `Guam`, code: 'GU', code3: 'GUM', numeric: '316'},
  {name: `Guatemala`, code: 'GT', code3: 'GTM', numeric: '320'},
  {name: `Guernsey`, code: 'GG', code3: 'GGY', numeric: '831'},
  {name: `Guinea`, code: 'GN', code3: 'GIN', numeric: '324'},
  {name: `Guinea-Bissau`, code: 'GW', code3: 'GNB', numeric: '624'},
  {name: `Guyana`, code: 'GY', code3: 'GUY', numeric: '328'},
  {name: `Haiti`, code: 'HT', code3: 'HTI', numeric: '332'},
  {
    name: `Heard Island and McDonald Islands`,
    code: 'HM',
    code3: 'HMD',
    numeric: '334',
  },
  {name: `Holy See (the)`, code: 'VA', code3: 'VAT', numeric: '336'},
  {name: `Honduras`, code: 'HN', code3: 'HND', numeric: '340'},
  {name: `Hong Kong`, code: 'HK', code3: 'HKG', numeric: '344'},
  {name: `Hungary`, code: 'HU', code3: 'HUN', numeric: '348'},
  {name: `Iceland`, code: 'IS', code3: 'ISL', numeric: '352'},
  {name: `India`, code: 'IN', code3: 'IND', numeric: '356'},
  {name: `Indonesia`, code: 'ID', code3: 'IDN', numeric: '360'},
  {
    name: `Iran (Islamic Republic of)`,
    code: 'IR',
    code3: 'IRN',
    numeric: '364',
  },
  {name: `Iraq`, code: 'IQ', code3: 'IRQ', numeric: '368'},
  {name: `Ireland`, code: 'IE', code3: 'IRL', numeric: '372'},
  {name: `Isle of Man`, code: 'IM', code3: 'IMN', numeric: '833'},
  {name: `Israel`, code: 'IL', code3: 'ISR', numeric: '376'},
  {name: `Italy`, code: 'IT', code3: 'ITA', numeric: '380'},
  {name: `Jamaica`, code: 'JM', code3: 'JAM', numeric: '388'},
  {name: `Japan`, code: 'JP', code3: 'JPN', numeric: '392'},
  {name: `Jersey`, code: 'JE', code3: 'JEY', numeric: '832'},
  {name: `Jordan`, code: 'JO', code3: 'JOR', numeric: '400'},
  {name: `Kazakhstan`, code: 'KZ', code3: 'KAZ', numeric: '398'},
  {name: `Kenya`, code: 'KE', code3: 'KEN', numeric: '404'},
  {name: `Kiribati`, code: 'KI', code3: 'KIR', numeric: '296'},
  {
    name: `Korea (the Democratic People's Republic of)`,
    code: 'KP',
    code3: 'PRK',
    numeric: '408',
  },
  {
    name: `Korea (the Republic of)`,
    code: 'KR',
    code3: 'KOR',
    numeric: '410',
  },
  {name: `Kuwait`, code: 'KW', code3: 'KWT', numeric: '414'},
  {name: `Kyrgyzstan`, code: 'KG', code3: 'KGZ', numeric: '417'},
  {
    name: `Lao People's Democratic Republic (the)`,
    code: 'LA',
    code3: 'LAO',
    numeric: '418',
  },
  {name: `Latvia`, code: 'LV', code3: 'LVA', numeric: '428'},
  {name: `Lebanon`, code: 'LB', code3: 'LBN', numeric: '422'},
  {name: `Lesotho`, code: 'LS', code3: 'LSO', numeric: '426'},
  {name: `Liberia`, code: 'LR', code3: 'LBR', numeric: '430'},
  {name: `Libya`, code: 'LY', code3: 'LBY', numeric: '434'},
  {name: `Liechtenstein`, code: 'LI', code3: 'LIE', numeric: '438'},
  {name: `Lithuania`, code: 'LT', code3: 'LTU', numeric: '440'},
  {name: `Luxembourg`, code: 'LU', code3: 'LUX', numeric: '442'},
  {name: `Macao`, code: 'MO', code3: 'MAC', numeric: '446'},
  {name: `Madagascar`, code: 'MG', code3: 'MDG', numeric: '450'},
  {name: `Malawi`, code: 'MW', code3: 'MWI', numeric: '454'},
  {name: `Malaysia`, code: 'MY', code3: 'MYS', numeric: '458'},
  {name: `Maldives`, code: 'MV', code3: 'MDV', numeric: '462'},
  {name: `Mali`, code: 'ML', code3: 'MLI', numeric: '466'},
  {name: `Malta`, code: 'MT', code3: 'MLT', numeric: '470'},
  {name: `Marshall Islands (the)`, code: 'MH', code3: 'MHL', numeric: '584'},
  {name: `Martinique`, code: 'MQ', code3: 'MTQ', numeric: '474'},
  {name: `Mauritania`, code: 'MR', code3: 'MRT', numeric: '478'},
  {name: `Mauritius`, code: 'MU', code3: 'MUS', numeric: '480'},
  {name: `Mayotte`, code: 'YT', code3: 'MYT', numeric: '175'},
  {name: `Mexico`, code: 'MX', code3: 'MEX', numeric: '484'},
  {
    name: `Micronesia (Federated States of)`,
    code: 'FM',
    code3: 'FSM',
    numeric: '583',
  },
  {
    name: `Moldova (the Republic of)`,
    code: 'MD',
    code3: 'MDA',
    numeric: '498',
  },
  {name: `Monaco`, code: 'MC', code3: 'MCO', numeric: '492'},
  {name: `Mongolia`, code: 'MN', code3: 'MNG', numeric: '496'},
  {name: `Montenegro`, code: 'ME', code3: 'MNE', numeric: '499'},
  {name: `Montserrat`, code: 'MS', code3: 'MSR', numeric: '500'},
  {name: `Morocco`, code: 'MA', code3: 'MAR', numeric: '504'},
  {name: `Mozambique`, code: 'MZ', code3: 'MOZ', numeric: '508'},
  {name: `Myanmar`, code: 'MM', code3: 'MMR', numeric: '104'},
  {name: `Namibia`, code: 'NA', code3: 'NAM', numeric: '516'},
  {name: `Nauru`, code: 'NR', code3: 'NRU', numeric: '520'},
  {name: `Nepal`, code: 'NP', code3: 'NPL', numeric: '524'},
  {name: `Netherlands (the)`, code: 'NL', code3: 'NLD', numeric: '528'},
  {name: `New Caledonia`, code: 'NC', code3: 'NCL', numeric: '540'},
  {name: `New Zealand`, code: 'NZ', code3: 'NZL', numeric: '554'},
  {name: `Nicaragua`, code: 'NI', code3: 'NIC', numeric: '558'},
  {name: `Niger (the)`, code: 'NE', code3: 'NER', numeric: '562'},
  {name: `Nigeria`, code: 'NG', code3: 'NGA', numeric: '566'},
  {name: `Niue`, code: 'NU', code3: 'NIU', numeric: '570'},
  {name: `Norfolk Island`, code: 'NF', code3: 'NFK', numeric: '574'},
  {
    name: `Northern Mariana Islands (the)`,
    code: 'MP',
    code3: 'MNP',
    numeric: '580',
  },
  {name: `Norway`, code: 'NO', code3: 'NOR', numeric: '578'},
  {name: `Oman`, code: 'OM', code3: 'OMN', numeric: '512'},
  {name: `Pakistan`, code: 'PK', code3: 'PAK', numeric: '586'},
  {name: `Palau`, code: 'PW', code3: 'PLW', numeric: '585'},
  {name: `Palestine, State of`, code: 'PS', code3: 'PSE', numeric: '275'},
  {name: `Panama`, code: 'PA', code3: 'PAN', numeric: '591'},
  {name: `Papua New Guinea`, code: 'PG', code3: 'PNG', numeric: '598'},
  {name: `Paraguay`, code: 'PY', code3: 'PRY', numeric: '600'},
  {name: `Peru`, code: 'PE', code3: 'PER', numeric: '604'},
  {name: `Philippines (the)`, code: 'PH', code3: 'PHL', numeric: '608'},
  {name: `Pitcairn`, code: 'PN', code3: 'PCN', numeric: '612'},
  {name: `Poland`, code: 'PL', code3: 'POL', numeric: '616'},
  {name: `Portugal`, code: 'PT', code3: 'PRT', numeric: '620'},
  {name: `Puerto Rico`, code: 'PR', code3: 'PRI', numeric: '630'},
  {name: `Qatar`, code: 'QA', code3: 'QAT', numeric: '634'},
  {
    name: `Republic of North Macedonia`,
    code: 'MK',
    code3: 'MKD',
    numeric: '807',
  },
  {name: `Romania`, code: 'RO', code3: 'ROU', numeric: '642'},
  {
    name: `Russian Federation (the)`,
    code: 'RU',
    code3: 'RUS',
    numeric: '643',
  },
  {name: `Rwanda`, code: 'RW', code3: 'RWA', numeric: '646'},
  {name: `Réunion`, code: 'RE', code3: 'REU', numeric: '638'},
  {name: `Saint Barthélemy`, code: 'BL', code3: 'BLM', numeric: '652'},
  {
    name: `Saint Helena, Ascension and Tristan da Cunha`,
    code: 'SH',
    code3: 'SHN',
    numeric: '654',
  },
  {name: `Saint Kitts and Nevis`, code: 'KN', code3: 'KNA', numeric: '659'},
  {name: `Saint Lucia`, code: 'LC', code3: 'LCA', numeric: '662'},
  {
    name: `Saint Martin (French part)`,
    code: 'MF',
    code3: 'MAF',
    numeric: '663',
  },
  {
    name: `Saint Pierre and Miquelon`,
    code: 'PM',
    code3: 'SPM',
    numeric: '666',
  },
  {
    name: `Saint Vincent and the Grenadines`,
    code: 'VC',
    code3: 'VCT',
    numeric: '670',
  },
  {name: `Samoa`, code: 'WS', code3: 'WSM', numeric: '882'},
  {name: `San Marino`, code: 'SM', code3: 'SMR', numeric: '674'},
  {name: `Sao Tome and Principe`, code: 'ST', code3: 'STP', numeric: '678'},
  {name: `Saudi Arabia`, code: 'SA', code3: 'SAU', numeric: '682'},
  {name: `Senegal`, code: 'SN', code3: 'SEN', numeric: '686'},
  {name: `Serbia`, code: 'RS', code3: 'SRB', numeric: '688'},
  {name: `Seychelles`, code: 'SC', code3: 'SYC', numeric: '690'},
  {name: `Sierra Leone`, code: 'SL', code3: 'SLE', numeric: '694'},
  {name: `Singapore`, code: 'SG', code3: 'SGP', numeric: '702'},
  {
    name: `Sint Maarten (Dutch part)`,
    code: 'SX',
    code3: 'SXM',
    numeric: '534',
  },
  {name: `Slovakia`, code: 'SK', code3: 'SVK', numeric: '703'},
  {name: `Slovenia`, code: 'SI', code3: 'SVN', numeric: '705'},
  {name: `Solomon Islands`, code: 'SB', code3: 'SLB', numeric: '090'},
  {name: `Somalia`, code: 'SO', code3: 'SOM', numeric: '706'},
  {name: `South Africa`, code: 'ZA', code3: 'ZAF', numeric: '710'},
  {
    name: `South Georgia and the South Sandwich Islands`,
    code: 'GS',
    code3: 'SGS',
    numeric: '239',
  },
  {name: `South Sudan`, code: 'SS', code3: 'SSD', numeric: '728'},
  {name: `Spain`, code: 'ES', code3: 'ESP', numeric: '724'},
  {name: `Sri Lanka`, code: 'LK', code3: 'LKA', numeric: '144'},
  {name: `Sudan (the)`, code: 'SD', code3: 'SDN', numeric: '729'},
  {name: `Suriname`, code: 'SR', code3: 'SUR', numeric: '740'},
  {name: `Svalbard and Jan Mayen`, code: 'SJ', code3: 'SJM', numeric: '744'},
  {name: `Sweden`, code: 'SE', code3: 'SWE', numeric: '752'},
  {name: `Switzerland`, code: 'CH', code3: 'CHE', numeric: '756'},
  {name: `Syrian Arab Republic`, code: 'SY', code3: 'SYR', numeric: '760'},
  {
    name: `Taiwan (Province of China)`,
    code: 'TW',
    code3: 'TWN',
    numeric: '158',
  },
  {name: `Tajikistan`, code: 'TJ', code3: 'TJK', numeric: '762'},
  {
    name: `Tanzania, United Republic of`,
    code: 'TZ',
    code3: 'TZA',
    numeric: '834',
  },
  {name: `Thailand`, code: 'TH', code3: 'THA', numeric: '764'},
  {name: `Timor-Leste`, code: 'TL', code3: 'TLS', numeric: '626'},
  {name: `Togo`, code: 'TG', code3: 'TGO', numeric: '768'},
  {name: `Tokelau`, code: 'TK', code3: 'TKL', numeric: '772'},
  {name: `Tonga`, code: 'TO', code3: 'TON', numeric: '776'},
  {name: `Trinidad and Tobago`, code: 'TT', code3: 'TTO', numeric: '780'},
  {name: `Tunisia`, code: 'TN', code3: 'TUN', numeric: '788'},
  {name: `Turkey`, code: 'TR', code3: 'TUR', numeric: '792'},
  {name: `Turkmenistan`, code: 'TM', code3: 'TKM', numeric: '795'},
  {
    name: `Turks and Caicos Islands (the)`,
    code: 'TC',
    code3: 'TCA',
    numeric: '796',
  },
  {name: `Tuvalu`, code: 'TV', code3: 'TUV', numeric: '798'},
  {name: `Uganda`, code: 'UG', code3: 'UGA', numeric: '800'},
  {name: `Ukraine`, code: 'UA', code3: 'UKR', numeric: '804'},
  {
    name: `United Arab Emirates (the)`,
    code: 'AE',
    code3: 'ARE',
    numeric: '784',
  },
  {
    name: `United Kingdom of Great Britain and Northern Ireland (the)`,
    code: 'GB',
    code3: 'GBR',
    numeric: '826',
  },
  {
    name: `United States Minor Outlying Islands (the)`,
    code: 'UM',
    code3: 'UMI',
    numeric: '581',
  },
  {
    name: `United States of America (the)`,
    code: 'US',
    code3: 'USA',
    numeric: '840',
  },
  {name: `Uruguay`, code: 'UY', code3: 'URY', numeric: '858'},
  {name: `Uzbekistan`, code: 'UZ', code3: 'UZB', numeric: '860'},
  {name: `Vanuatu`, code: 'VU', code3: 'VUT', numeric: '548'},
  {
    name: `Venezuela (Bolivarian Republic of)`,
    code: 'VE',
    code3: 'VEN',
    numeric: '862',
  },
  {name: `Viet Nam`, code: 'VN', code3: 'VNM', numeric: '704'},
  {
    name: `Virgin Islands (British)`,
    code: 'VG',
    code3: 'VGB',
    numeric: '092',
  },
  {name: `Virgin Islands (U.S.)`, code: 'VI', code3: 'VIR', numeric: '850'},
  {name: `Wallis and Futuna`, code: 'WF', code3: 'WLF', numeric: '876'},
  {name: `Western Sahara`, code: 'EH', code3: 'ESH', numeric: '732'},
  {name: `Yemen`, code: 'YE', code3: 'YEM', numeric: '887'},
  {name: `Zambia`, code: 'ZM', code3: 'ZMB', numeric: '894'},
  {name: `Zimbabwe`, code: 'ZW', code3: 'ZWE', numeric: '716'},
  {name: `Åland Islands`, code: 'AX', code3: 'ALA', numeric: '248'},
]

export const createContractDataReader = address => (key, format) =>
  callRpc('contract_readData', address, key, format)

export async function fetchVoting(address) {
  const readContractKey = createContractDataReader(address)

  return {
    status: mapToVotingStatus(
      await readContractKey('state', 'byte').catch(e => {
        if (e.message === 'data is nil') return VotingStatus.Terminated
        return VotingStatus.Invalid
      })
    ),
    ...hexToObject(await readContractKey('fact', 'hex').catch(() => null)),
    result: await readContractKey('result', 'byte').catch(() => null),
  }
}

const mapToVotingStatus = status => {
  switch (status) {
    case 0:
      return VotingStatus.Pending
    case 1:
      return VotingStatus.Open
    case 2:
      return VotingStatus.Archived
    default:
      return status
  }
}
