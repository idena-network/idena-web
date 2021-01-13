/* eslint-disable no-undef */
import {useEffect, useRef, useState} from 'react'

export default function useGooglePicker() {
  const [url, setUrl] = useState('')

  const ref = useRef()

  const open = () => ref.current && ref.current.setVisible(true)

  useEffect(() => {
    // eslint-disable-next-line no-undef
    if (!ref.current) {
      gapi.load('picker', () => {
        const view = new google.picker.View(google.picker.ViewId.IMAGE_SEARCH)
        view.setMimeTypes('image/png,image/jpeg,image/jpg')

        const picker = new google.picker.PickerBuilder()
          .addView(view)
          .enableFeature(google.picker.Feature.NAV_HIDDEN)
          .hideTitleBar()
          .setCallback(data => {
            const action = data[google.picker.Response.ACTION]
            if (action === google.picker.Action.PICKED) {
              const [{url: pickedUrl}] = data.docs[0].thumbnails
              setUrl(pickedUrl)
            }
          })
          .setSize(700, 500)
          .build()

        ref.current = picker
      })
    }
  }, [url])

  return {open, url}
}
