/** Creates a DAG with additional data
	Usage example:
	let dag = dag_with_family_data(links);
	dag.transfer_data_and_xy(other_dag);
*/
function dag_with_family_data(links, input_per_node_id = {}) {
	// Create a DAG with relations using given links
	let dag = dag_with_relations(links);
	// Transfer input data if available
	for (let node of dag.nodes()) {
		node.added_data = new Object();
		node.added_data.is_expandable = false;
		node.added_data.is_highlighted = false;
		node.added_data.is_visible = false;
		if (node.data in input_per_node_id) {
			node.added_data.input = new Object();
			node.added_data.input = input_per_node_id[node.data];
		}
	}
	// Transfers the data from given DAG
	dag.get_data_and_xy = function(from_dag) {
		get_data_and_xy(from_dag, dag);
	};
	return dag;
}

function get_name(node) {
	if (!node.added_data.input) return "?";
	for (let key of ["Name", "name"])
		if (node.added_data.input.hasOwnProperty(key))
			if (node.added_data.input[key] != "") return node.added_data.input[key];
	return "?";
}

function get_second_names(node) {
	if (!node.added_data.input) return "";
	for (let key of ["Zweitnamen", "second_names"])
		if (node.added_data.input.hasOwnProperty(key))
			if (node.added_data.input[key] != "") return node.added_data.input[key];
	return "";
}

function get_birth_date_of_member(member) {
	for (let key of ["Geburtstag", "birth_date"])
		if (member.hasOwnProperty(key))
			if (member[key] != "") return member[key];
	return "?";
}

function get_birth_date(node) {
	if (!node.added_data.input) return "?";
	return get_birth_date_of_member(node.added_data.input);
}

function get_death_date(node) {
	if (!node.added_data.input) return "";
	for (let key of ["Todestag", "death_date"])
		if (node.added_data.input.hasOwnProperty(key)) return node.added_data.input[key];
	return "";
}

function get_birth_place(node) {
	if (!node.added_data.input) return "?";
	for (let key of ["Geburtsort", "birth_place"])
		if (node.added_data.input.hasOwnProperty(key))
			if (node.added_data.input[key] != "") return node.added_data.input[key];
	return "";
}

function get_death_place(node) {
	if (!node.added_data.input) return "";
	for (let key of ["Todesort", "death_place"])
		if (node.added_data.input.hasOwnProperty(key)) return node.added_data.input[key];
	return "";
}

function get_marriage(node) {
	if (!node.added_data.input) return "";
	for (let key of ["Hochzeit", "marriage"])
		if (node.added_data.input.hasOwnProperty(key)) return node.added_data.input[key];
	return "";
}

function get_occupation(node) {
	if (!node.added_data.input) return "";
	for (let key of ["Beruf", "occupation"])
		if (node.added_data.input.hasOwnProperty(key)) return node.added_data.input[key];
	return "";
}

function get_note(node) {
	if (!node.added_data.input) return "";
	for (let key of ["Notiz", "note"])
		if (node.added_data.input.hasOwnProperty(key)) return node.added_data.input[key];
	return "";
}

function get_year_from_string(date_string, default_year) {
	if (date_string == "?") return default_year;
	let numbers = String(date_string).match(/\d+/gi);
	if (!numbers) return default_year;
	numbers = numbers.filter(x => Number(x) > 31);
	if (numbers.length <= 0) {
		return default_year;
	} else {
		return Number(numbers[0]);
	}
}

function get_year_of_birth_date(node) {
	const date_string = get_birth_date(node);
	return get_year_from_string(date_string, 1980);
}

function get_image_path(node) {
	if (!node.added_data.input) return "";
	for (let key of ["image_path"])
		if (node.added_data.input.hasOwnProperty(key)) return node.added_data.input[key];
	return "";
}

function get_data_and_xy(dag_1, dag_2) {
	// If one of the DAGs are not yet defined, return
	if ((!dag_1) || (!dag_2)) return;
	let nodes_1 = Array.from(dag_1.nodes());
	for (let node_2 of dag_2.nodes()) {
		let node_1 = nodes_1.find(node => node.data == node_2.data);
		if (!node_1) continue;
		// Note: Use ux and uy to avoid exception if undefined
		node_2.x = node_1.ux;
		node_2.y = node_1.uy;
		node_2.added_data = node_1.added_data;
	}
}

function is_member(node) {
	return node.added_data.input != undefined;
}