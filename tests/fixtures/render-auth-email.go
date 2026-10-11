// Execute generated templates with the same standard html/template engine as Supabase Auth.
package main

import (
	"bytes"
	"encoding/json"
	"html/template"
	"os"
)

type input struct {
	Subject string
	HTML    string
	Data    map[string]string
}
type output struct {
	Subject string
	HTML    string
}

func main() {
	var inputs []input
	if err := json.NewDecoder(os.Stdin).Decode(&inputs); err != nil {
		panic(err)
	}
	results := make([]output, 0, len(inputs))
	render := func(source string, data map[string]string) string {
		t, err := template.New("email").Parse(source)
		if err != nil {
			panic(err)
		}
		var b bytes.Buffer
		if err := t.Execute(&b, data); err != nil {
			panic(err)
		}
		return b.String()
	}
	for _, in := range inputs {
		results = append(results, output{render(in.Subject, in.Data), render(in.HTML, in.Data)})
	}
	if err := json.NewEncoder(os.Stdout).Encode(results); err != nil {
		panic(err)
	}
}
