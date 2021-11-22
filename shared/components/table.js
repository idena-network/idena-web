/* eslint-disable react/jsx-curly-brace-presence */
import React from 'react'
import PropTypes from 'prop-types'
import theme, {rem} from '../theme'

export function Table({children, ...props}) {
  return (
    <table {...props}>
      {children}
      <style jsx>{`
        width: 100%;
        border-collapse: collapse;
      `}</style>
    </table>
  )
}

Table.propTypes = {
  children: PropTypes.node,
}

const RowContext = React.createContext()

// eslint-disable-next-line react/prop-types
export function TableRow({children, isLast, ...props}) {
  return (
    <tr {...props}>
      <RowContext.Provider value={{isLast}}>{children}</RowContext.Provider>
      <style jsx>{`
        width: 100%;
      `}</style>
    </tr>
  )
}

// eslint-disable-next-line react/prop-types
export function TableCol({children, color, ...props}) {
  const {isLast} = React.useContext(RowContext)

  return (
    <td {...props}>
      {children}
      <style jsx>{`
        td {
          padding: ${rem(8)} ${rem(12)};
          color: ${color || 'inherit'};
          border-bottom: ${isLast ? 'none' : `solid 1px ${theme.colors.gray2}`};
        }

        td.text-right {
          text-align: right;
        }
      `}</style>
    </td>
  )
}

export function TableHeaderCol({children, ...props}) {
  return (
    <th {...props}>
      {children}
      <style jsx>{`
        th {
          color: ${theme.colors.muted};
          font-weight: normal;
          background-color: ${theme.colors.gray};
          padding: ${rem(7)} ${rem(12)};
          text-align: left;
        }
        th:first-child {
          border-radius: ${rem(6)} 0 0 ${rem(6)};
        }
        th:last-child {
          border-radius: 0 ${rem(6)} ${rem(6)} 0;
        }
        th.text-right {
          text-align: right;
        }
      `}</style>
    </th>
  )
}

TableHeaderCol.propTypes = {
  children: PropTypes.node,
}

export function TableHint({children, ...props}) {
  return (
    <div {...props}>
      {children}
      <style jsx>{`
        div {
          color: ${theme.colors.muted};
          font-size: ${rem(13)};
          font-weight: 500;
        }
      `}</style>
    </div>
  )
}

TableHint.propTypes = {
  children: PropTypes.node,
}
