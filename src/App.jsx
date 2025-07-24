import {onMount, createSignal, Show, For} from 'solid-js';
import Papa from 'papaparse';

function matches(rule, rec, account) {
  const amount = (rec.Funds_In || 0)  - (rec.Funds_Out || 0);
  return (
    ((rule.Match_type == 'Starts with' && rec.Transaction_Details.startsWith(rule.Match_text))
     || (rule.Match_type == 'Contains' && rec.includes(rule.Match_text))
     || (rule.Match_type == 'Ends with' && rec.endsWith(rule.Match_text)))
    && (rule.Account == null || rule.Account == account)
    && (rule.Amount_min == 0 || rule.Amount_min >= amount)
    && (rule.Amount_max == 0 || rule.Amount_max <= amount)
  )
}

function apply(rule, rec) {
  return;
}

function App() {
  const [accounts, setAccounts] = createSignal([]);

  onMount(async () => {
    grist.ready({requiredAccess: 'full'})
    const accs = await grist.docApi.fetchTable("Accounts");
    const ccsa = accs.id.flatMap((acid, ix) => {
      if (accs.Kind[ix] == "Assets" || accs.Kind[ix] == "Liability") {
        return {id: acid, Name: accs.Name[ix]}
      } else {
        return []
      }
    })
    setAccounts(ccsa)
  })

  let file_input;
  let acc_sel;

  const [parseErrors, setParseErrors] = createSignal([]);

  function submitForm(ev) {
    ev.preventDefault();
    const acc = acc_sel.value;
    Papa.parse(file_input.files[0], {
      header: true,
      transformHeader: (header, _ix) => (header.trim().replaceAll(" ", "_")),
      skipEmptyLines: true,
      error: (er) => {
        console.error(`Unable to read file: ${er}`)
      },
      complete: (results, _file) => {
        importTransactions(results, acc)
      }
    })
  }

  async function importTransactions(results, acct_id) {
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
    srule.sort((a, b) => a.Priority - b.Priority)
    recs = []
    for (const rec of results.data) {
      for (const rule of srule) {
        if (matches(rule, rec, acct_id)) {
          apply(rule, rec);
          recs.push(rec);
          break;
        }
      }
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
        <label>
          Select an account to import these transactions into.
          <select ref={acc_sel} name="account">
            {accounts().map((ac) => <option value="{ac.id}">{ac.Name}</option>)}
          </select>
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
