import {onMount, createSignal, Show, For} from 'solid-js';
import Papa from 'papaparse';

function App() {
  onMount(() => grist.ready({requiredAccess: 'full'}))

  let file_input;

  const [parseErrors, setParseErrors] = createSignal([]);

  function submitForm(ev) {
    ev.preventDefault();
    Papa.parse(file_input.files[0], {
      header: true,
      skipEmptyLines: true,
      error: (er) => {
        console.error(`Unable to read file: ${er}`)
      },
      complete: (results, _file) => {
        importTransactions(results)
      }
    })
  }

  async function importTransactions(results) {
    if (results.errors.length > 0) {
      setParseErrors(results.errors);
      return;
    }
    const t_tra = grist.getTable("Transactions");
    const t_imp = grist.getTable("Imported");
    const rules = await grist.docApi.fetchTable("Rules");
    const srule = [];
    for (const col in rules) {
      rules[col].forEach((val, ix) => {
        if (srule[ix] == undefined) {
          srule[ix] = {}
        }
        srule[ix][col] = val;
      })
    }
    return await t_imp.create(results.data.map((row) => ({fields: row})), {parseStrings: true});
  }

  return (
    <div>
      <form onSubmit={submitForm}>
        <label>
          Choose a CSV file containing transactions to import.
          <input ref={file_input} type="file" name="transactions" accept="text/csv" />
        </label>
        <button type="submit">Import</button>
      </form>
      <Show when={parseErrors().length > 0}>
        <p>The following errors occurred:</p>
        <ul>
          <For each={parseErrors()}>
            {(er) => <li>Row {er.row}: {er.message}</li>}
          </For>
        </ul>
      </Show>
    </div>
  );
}

export default App;
