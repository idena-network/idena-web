/* eslint-disable react/prop-types */
import React from 'react'
import NextLink from 'next/link'
import {IconButton} from './button'

export default function IconLink({href, icon, ...props}) {
  const iconButton = <IconButton icon={icon} {...props} />
  return href ? <NextLink href={href}>{iconButton}</NextLink> : iconButton
}
