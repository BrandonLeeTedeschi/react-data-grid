import { useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { faker } from '@faker-js/faker';
import { css } from '@linaria/core';

import { DataGrid, SelectColumn, textEditor } from '../../src';
import type { Column, SortColumn } from '../../src';
import { textEditorClassname } from '../../src/editors/textEditor';
import type { Direction, MultiPasteArgs } from '../../src/types';

const toolbarClassname = css`
  text-align: end;
  margin-block-end: 8px;
`;

const dialogContainerClassname = css`
  position: absolute;
  inset: 0;
  display: flex;
  place-items: center;
  background: rgba(0, 0, 0, 0.1);
  > dialog {
    width: 300px;
    > input {
      width: 100%;
    }
    > menu {
      text-align: end;
    }
  }
`;

export const Route = createFileRoute({
  component: RangeSelection
});

const dateFormatter = new Intl.DateTimeFormat(navigator.language);
const currencyFormatter = new Intl.NumberFormat(navigator.language, {
  style: 'currency',
  currency: 'eur'
});

function TimestampFormatter({ timestamp }: { timestamp: number }) {
  return <>{dateFormatter.format(timestamp)}</>;
}

function CurrencyFormatter({ value }: { value: number }) {
  return <>{currencyFormatter.format(value)}</>;
}

interface SummaryRow {
  id: string;
  totalCount: number;
  yesCount: number;
}

interface Row {
  id: number;
  title: string;
  client: string;
  area: string;
  country: string;
  contact: string;
  assignee: string;
  progress: number;
  startTimestamp: number;
  endTimestamp: number;
  budget: number;
  transaction: string;
  account: string;
  version: string;
  available: boolean;
}

function getColumns(countries: string[], direction: Direction): readonly Column<Row, SummaryRow>[] {
  return [
    SelectColumn,
    {
      key: 'id',
      name: 'ID',
      width: 60,
      frozen: true,
      resizable: false,
      summaryFormatter() {
        return <strong>Total</strong>;
      }
    },
    {
      key: 'title',
      name: 'Task',
      width: 120,
      frozen: true,
      editor: textEditor,
      summaryFormatter({ row }) {
        return <>{row.totalCount} records</>;
      }
    },
    {
      key: 'client',
      name: 'Client',
      width: 220,
      editor: textEditor
    },
    {
      key: 'area',
      name: 'Area',
      width: 120,
      editor: textEditor
    },
    {
      key: 'country',
      name: 'Country',
      width: 180,
      editor: (p) => (
        <select
          autoFocus
          className={textEditorClassname}
          value={p.row.country}
          onChange={(e) => p.onRowChange({ ...p.row, country: e.target.value }, true)}
        >
          {countries.map((country) => (
            <option key={country}>{country}</option>
          ))}
        </select>
      ),
      editorOptions: {
        editOnClick: true
      }
    },
    {
      key: 'contact',
      name: 'Contact',
      width: 160,
      editor: textEditor
    },
    {
      key: 'assignee',
      name: 'Assignee',
      width: 150,
      editor: textEditor
    },
    {
      key: 'progress',
      name: 'Completion',
      width: 110,
      formatter(props) {
        const value = props.row.progress;
        return (
          <>
            <progress max={100} value={value} style={{ inlineSize: 50 }} /> {Math.round(value)}%
          </>
        );
      },
      editor({ row, onRowChange, onClose }) {
        return createPortal(
          <div
            dir={direction}
            className={dialogContainerClassname}
            onKeyDown={(event) => {
              if (event.key === 'Escape') {
                onClose();
              }
            }}
          >
            <dialog open>
              <input
                autoFocus
                type="range"
                min="0"
                max="100"
                value={row.progress}
                onChange={(e) => onRowChange({ ...row, progress: e.target.valueAsNumber })}
              />
              <menu>
                <button onClick={() => onClose()}>Cancel</button>
                <button onClick={() => onClose(true)}>Save</button>
              </menu>
            </dialog>
          </div>,
          document.body
        );
      },
      editorOptions: {
        renderFormatter: true
      }
    },
    {
      key: 'startTimestamp',
      name: 'Start date',
      width: 100,
      formatter(props) {
        return <TimestampFormatter timestamp={props.row.startTimestamp} />;
      }
    },
    {
      key: 'endTimestamp',
      name: 'Deadline',
      width: 100,
      formatter(props) {
        return <TimestampFormatter timestamp={props.row.endTimestamp} />;
      }
    },
    {
      key: 'budget',
      name: 'Budget',
      width: 100,
      formatter(props) {
        return <CurrencyFormatter value={props.row.budget} />;
      }
    },
    {
      key: 'transaction',
      name: 'Transaction type'
    },
    {
      key: 'account',
      name: 'Account',
      width: 150
    },
    {
      key: 'version',
      name: 'Version',
      editor: textEditor
    },
    {
      key: 'available',
      name: 'Available',
      width: 80,
      formatter({ row, onRowChange, isCellSelected }) {
        return (
          <SelectCellFormatter
            value={row.available}
            onChange={() => {
              onRowChange({ ...row, available: !row.available });
            }}
            isCellSelected={isCellSelected}
          />
        );
      },
      summaryFormatter({ row: { yesCount, totalCount } }) {
        return <>{`${Math.floor((100 * yesCount) / totalCount)}% ✔️`}</>;
      }
    }
  ];
}

function rowKeyGetter(row: Row) {
  return row.id;
}

function createRows(): readonly Row[] {
  const now = Date.now();
  const rows: Row[] = [];

  for (let i = 0; i < 1000; i++) {
    rows.push({
      id: i,
      title: `Task #${i + 1}`,
      client: faker.company.name(),
      contact: faker.internet.exampleEmail(),
      progress: Math.random() * 100,
      startTimestamp: now - Math.round(Math.random() * 1e10),
      endTimestamp: now + Math.round(Math.random() * 1e10),
      budget: 500 + Math.random() * 10500,
      transaction: faker.finance.transactionType(),
      account: faker.finance.iban(),
      version: faker.system.semver(),
      available: Math.random() > 0.5
    });
  }

  return rows;
}

type Comparator = (a: Row, b: Row) => number;
function getComparator(sortColumn: string): Comparator {
  switch (sortColumn) {
    case 'assignee':
    case 'title':
    case 'client':
    case 'area':
    case 'country':
    case 'contact':
    case 'transaction':
    case 'account':
    case 'version':
      return (a, b) => {
        return a[sortColumn].localeCompare(b[sortColumn]);
      };
    case 'available':
      return (a, b) => {
        return a[sortColumn] === b[sortColumn] ? 0 : a[sortColumn] ? 1 : -1;
      };
    case 'id':
    case 'progress':
    case 'startTimestamp':
    case 'endTimestamp':
    case 'budget':
      return (a, b) => {
        return a[sortColumn] - b[sortColumn];
      };
    default:
      throw new Error(`unsupported sortColumn: "${sortColumn}"`);
  }
}

export default function RangeSelection({ direction }: Props) {
  const [rows, setRows] = useState(createRows);
  const [sortColumns, setSortColumns] = useState<readonly SortColumn[]>([]);
  const [selectedRows, setSelectedRows] = useState<ReadonlySet<number>>(() => new Set());

  const countries = useMemo(() => {
    return [...new Set(rows.map((r) => r.country))].sort(new Intl.Collator().compare);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const columns = useMemo(() => getColumns(countries, direction), [countries, direction]);

  const summaryRows = useMemo(() => {
    const summaryRow: SummaryRow = {
      id: 'total_0',
      totalCount: rows.length,
      yesCount: rows.filter((r) => r.available).length
    };
    return [summaryRow];
  }, [rows]);

  const sortedRows = useMemo((): readonly Row[] => {
    if (sortColumns.length === 0) return rows;

    return [...rows].sort((a, b) => {
      for (const sort of sortColumns) {
        const comparator = getComparator(sort.columnKey);
        const compResult = comparator(a, b);
        if (compResult !== 0) {
          return sort.direction === 'ASC' ? compResult : -compResult;
        }
      }
      return 0;
    });
  }, [rows, sortColumns]);

  function getRangeSize(start: number, end: number) {
    return Math.abs(start - end);
  }

  function handleMultiPaste({ copiedRange, targetRange }: MultiPasteArgs) {
    if (!copiedRange) return [...rows];
    const sourceRange = copiedRange;
    const destinationRange = targetRange;
    if (
      getRangeSize(sourceRange.endRowIdx, sourceRange.startRowIdx) !==
        getRangeSize(destinationRange.endRowIdx, destinationRange.startRowIdx) ||
      getRangeSize(sourceRange.startColumnIdx, sourceRange.endColumnIdx) !==
        getRangeSize(destinationRange.startColumnIdx, destinationRange.endColumnIdx)
    ) {
      return [...rows];
    }

    const newRows = [...rows];
    const sourceStartRow = Math.min(sourceRange.startRowIdx, sourceRange.endRowIdx);
    const sourceStartCol = Math.min(sourceRange.startColumnIdx, sourceRange.endColumnIdx);
    const destinationStartRow = Math.min(destinationRange.startRowIdx, destinationRange.endRowIdx);
    const destinationStartCol = Math.min(
      destinationRange.startColumnIdx,
      destinationRange.endColumnIdx
    );

    for (let i = 0; i <= getRangeSize(sourceRange.startRowIdx, sourceRange.endRowIdx); i++) {
      for (
        let j = 0;
        j <= getRangeSize(sourceRange.startColumnIdx, sourceRange.endColumnIdx);
        j++
      ) {
        const sourceColumnKey = columns[sourceStartCol + j].key;
        const destinationColumnKey = columns[destinationStartCol + j].key;
        // @ts-ignore
        newRows[destinationStartRow + i][destinationColumnKey] =
          newRows[sourceStartRow + i][sourceColumnKey];
      }
    }

    return newRows;
  }

  const gridElement = (
    <DataGrid
      rowKeyGetter={rowKeyGetter}
      columns={columns}
      rows={sortedRows}
      defaultColumnOptions={{
        sortable: true,
        resizable: true
      }}
      selectedRows={selectedRows}
      onSelectedRowsChange={setSelectedRows}
      onRowsChange={setRows}
      sortColumns={sortColumns}
      onSortColumnsChange={setSortColumns}
      summaryRows={summaryRows}
      className="fill-grid"
      direction={direction}
      enableRangeSelection
      onMultiPaste={handleMultiPaste}
    />
  );

  return <>{gridElement}</>;
}
