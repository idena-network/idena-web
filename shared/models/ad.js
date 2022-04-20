import {adFallbackSrc} from '../../screens/ads/utils'
import {stripHexPrefix} from '../utils/buffers'
import root from './proto/models_pb'

export class Ad {
  constructor({title, desc, url, thumb, media}) {
    Object.assign(this, {title, desc, url, thumb, media})
  }

  static fromBytes = bytes => {
    const protoAd = root.ProtoAd.deserializeBinary(bytes)

    const thumb = protoAd.getThumb()
    const media = protoAd.getMedia()

    return new Ad({
      title: protoAd.getTitle(),
      desc: protoAd.getDesc(),
      url: protoAd.getUrl(),
      thumb: thumb
        ? URL.createObjectURL(new Blob([thumb], {type: 'image/jpeg'}))
        : adFallbackSrc,
      media: media
        ? URL.createObjectURL(new Blob([media], {type: 'image/jpeg'}))
        : adFallbackSrc,
    })
  }

  static fromHex = hex => Ad.fromBytes(Buffer.from(stripHexPrefix(hex), 'hex'))

  toBytes() {
    const data = new root.ProtoAd()

    data.setTitle(this.title)
    data.setDesc(this.desc)
    data.setUrl(this.url)
    data.setThumb(this.thumb)
    data.setMedia(this.media)

    return data.serializeBinary()
  }

  toHex() {
    return Buffer.from(this.toBytes()).toString('hex')
  }
}
