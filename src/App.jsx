import {onMount, createSignal, Show, For} from 'solid-js';
import Papa from 'papaparse';

function App() {
  onMount(() => grist.ready({requiredAccess: 'full'}))

  let file_input;

  const [parseErrors, setParseErrors] = createSignal([]);

  function importTransactions(ev) {
    ev.preventDefault();
    const t_tra = grist.getTable("Transactions");
    const t_imp = grist.getTable("Imported");
    Papa.parse(file_input.files[0], {
      header: true,
      complete: (results, file) => {
        if (results.errors.length > 0) {
          setParseErrors(results.errors);
          return;
        }
        t_imp.create(results.data)
      }
    })
  }

  return (
    <div>
      <form>
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
            {(er) => <li>{er.message}</li>}
          </For>
        </ul>
      </Show>
    </div>
  );
}

export default App;
