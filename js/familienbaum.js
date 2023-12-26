class Familienbaum
{
	constructor(input, svg, div = undefined) {
		// Remember the inputs
		this.data = input;
		this.svg = svg;
		this.editing_div = div;
		// Prepare things related to d3 and SVG
		this.g = this.svg.append("g");
		this.zoom = d3.zoom().on("zoom", event => this.g.attr("transform", event.transform));
		this.svg.call(this.zoom);
		this.info = this.add_info_text(svg);
		// Set the duration of a transition
		this.transition_milliseconds = 500;
		// Create the DAGs
		this.reset_dags();
	}

	reset_dags() {
		// Check that links and members exist
		if (!this.data["links"]) throw "No links in input";
		if (!this.data["members"]) throw "No members in input";
		if (!this.data["start"]) throw "No starting node ID in input";
		// Create the entire DAG and read input
		this.dag_all = dag_with_family_data(this.data["links"], this.data["members"]);
		this.dag = undefined; // the part of the DAG that will be visualized
		// Find starting node and set node coordinates
		let node_of_dag_all = this.dag_all.find_node(this.data["start"]);
		node_of_dag_all.added_data.x0 = this.svg.attr("height") / 2;
		node_of_dag_all.added_data.y0 = this.svg.attr("width") / 2;
		node_of_dag_all.added_data.is_visible = true;
		// Choose visible nodes at the beginning
		for (let node of this.get_relationship_in_dag_all(node_of_dag_all)) {
			node.added_data.is_visible = true;
		}
	}

	click(current_node_id) {
		// First find the clicked node
		let node_of_dag = this.dag.find_node(current_node_id);
		let node_of_dag_all = this.dag_all.find_node(current_node_id);
		if (node_of_dag.added_data.is_highlighted) {
			// Mark all nodes of relationship as visible in unfiltered DAG
			let adjacents = this.get_relationship_in_dag_all(node_of_dag_all);
			for (let adjacent of adjacents)
				adjacent.added_data.is_visible = true;
		} else // not highlighted
		{
			// Mark all other nodes as invisible in filtered DAG
			for (let descendant of this.dag_all.nodes())
				if (descendant.data != current_node_id) descendant.added_data.is_visible = false;
			// Choose visible nodes surrounding
			for (let node of this.get_relationship_in_dag_all(node_of_dag_all))
				node.added_data.is_visible = true;
		}
	}

	draw(recenter = true, current_node_id = this.data["start"]) {
		// Filter to include only links between visible nodes
		let links = new Array();
		for (let link of this.dag_all.links())
			if (link.source.added_data.is_visible && link.target.added_data.is_visible)
				links.push([link.source.data, link.target.data]);
		// Create DAG on filtered edges
		this.dag_all.get_data_and_xy(this.dag); // if a filtered DAG exists, transfer data
		this.dag = dag_with_family_data(links); // create on filtered links
		this.dag.get_data_and_xy(this.dag_all); // now transfer data from unfiltered DAG
		// Mark expandable nodes to be highlighted
		for (let node of this.dag.nodes()) {
			let node_of_dag_all = this.dag_all.find_node(node.data);
			node.added_data.is_highlighted = this.is_expandable_in_dag_all(node_of_dag_all);
		}
		// Calculate layout
		this.layout = new Dag_Layout(this.dag, [80, 140]);
		this.layout.run();
		// Find current node in the filtered DAG
		let current_node = this.dag.find_node(this.data["start"] = current_node_id);
		// Draw nodes and links
		this.draw_nodes(this.dag.nodes(), current_node);
		this.draw_links(this.dag.links(), current_node);
		// Recenter the entire DAG to window
		if (recenter)
			this.svg.transition()
				.duration(this.transition_milliseconds)
				.call(
					this.zoom.transform,
					d3.zoomTransform(this.g.node())
						.translate(current_node.added_data.y0 - current_node.y,
							current_node.added_data.x0 - current_node.x),
				);
		// Store current node positions for next transition
		for (let node of this.dag.nodes()) {
			node.added_data.x0 = node.x;
			node.added_data.y0 = node.y;
		}
	}

	draw_nodes(nodes, current_node) {
		// Sort in order to draw members on top of family nodes
		let nodes_to_draw = Array.from(nodes);
		nodes_to_draw.sort((node_1, node_2) => {
			let node_pair = [node_1, node_2];
			let compare = node_pair.map(is_member);
			if (compare[0] > compare[1]) return true;
			if (compare[0] < compare[1]) return false;
			return node_1.data > node_2.data;
	 	});
		// The data is connected by providing a key function
		let nodes_selected = this.g.selectAll("g.node").data(nodes_to_draw, node => node.data);
		// Entering nodes will appear at current_node position
		let node_enter_group =
			nodes_selected.enter()
				.append("g")
				.attr("class", "node")
				.attr("transform",
					_ => "translate(" + current_node.added_data.y0 + "," + current_node.added_data.x0 + ")")
				.attr("visible", true);
		// Add the nodes' labels
		if (this.editing_div) {
			node_enter_group.each(function(node) {
				set_multiline(d3.select(this), node)
			});
		} else {
			node_enter_group.each(function(node) {
				set_multiline(d3.select(this), node, false)
			});
		}
		// Get the CSS style of given node
		function get_css_class(node) {
			if (!is_member(node)) return "family";
			if (!node.added_data.is_highlighted) {
				return "member non-highlighted";
			} else {
				return "member highlighted";
			}
		}
		// Add a group that will contain the circle and the text
		let circle_group =
			node_enter_group.append("g").attr("cursor", "pointer").on("click", (event, node) => {
				if (this.editing_div) this.editing_div.selectAll("form").remove();
				this.click(node.data);
				this.draw(true, node.data);
			});
		// Add a circle as SVG object
		circle_group.append("circle")
			.attr("class", get_css_class)
			.attr("r", node => get_node_size() / (is_member(node) ? 1.0 : 4.0));
		// Add the images
		add_images(circle_group);
		// Add editing functionality
		if (this.editing_div) {
			node_enter_group.append("g")
				.attr("cursor", "pointer")
				.on("click",
					(event, node) => {
						this.editing_div.selectAll("form").remove();
						if (typeof this.create_editing_form === "function") {
							let node_of_dag = node;
							let node_of_dag_all = this.dag_all.find_node(node.data);
							this.create_editing_form(node_of_dag, node_of_dag_all);
						}
					})
				.append("text")
				.attr("cursor", "pointer")
				.attr("class", "plus-label")
				.append("tspan")
				.attr("text-anchor", "middle")
				.attr("y", node => -get_node_size() / (is_member(node) ? 1.1 : 3.0))
				.attr("x", node => get_node_size() / (is_member(node) ? 1.1 : 3.0))
				.text("+");
		}
		// The nodes to be updated
		let node_update = node_enter_group.merge(nodes_selected);
		// Define the transition
		node_update.transition()
			.duration(this.transition_milliseconds)
			.attr("transform", node => "translate(" + node.y + "," + node.x + ")");
		// Update highlighted status
		node_update.select("circle").attr("class", get_css_class);
		// Remove any node that becomes invisible
		let node_exit = nodes_selected.exit()
			.transition()
			.duration(this.transition_milliseconds / 5)
			.attr("visible", false)
			.remove();
		// Fade labels of nodes being removed
		node_exit.select("text").style("fill-opacity", 1e-6);
		// Fade circles of nodes being removed
		node_exit.select("circle").style("fill-opacity", 1e-6).style("stroke-opacity", 1e-6);
	}

	draw_links(links, current_node) {
		// Get the description of a curved edge
		function get_curved_edge(s, d) {
			return `M ${s.y} ${s.x} C ${(s.y + d.y) / 2} ${s.x}, 
				${(s.y + d.y) / 2} ${d.x}, 
				${d.y} ${d.x}`;
		}
		// The data is connected by providing a key function
		let link =
			this.g.selectAll("path.link").data(links, link => link.source.data + "_" + link.target.data);
		// Entering links will appear at current_node position
		let link_enter = link.enter().insert("path", "g").attr("class", "link").attr("d", function() {
			let o = { x: current_node.added_data.x0, y: current_node.added_data.y0 };
			return get_curved_edge(o, o);
		});
		// The links to be updated
		let link_update = link_enter.merge(link);
		// Define the transition
		link_update.transition()
			.duration(this.transition_milliseconds)
			.attr("d", link => get_curved_edge(link.source, link.target));
		// Remove any link that becomes invisible
		let link_exit = link.exit()
			.transition()
			.duration(this.transition_milliseconds / 5)
			.style("stroke-opacity", 1e-6)
			.remove();
	}

	get_relationship_in_dag_all(node) {
		if (is_member(node)) return this.dag_all.second_level_adjacency(node); // member node
		return this.dag_all.first_level_adjacency(node); // family node
	}

	is_expandable_in_dag_all(node) {
		let adjacents = Array.from(this.get_relationship_in_dag_all(node));
		return adjacents.some(adjacent => !adjacent.added_data.is_visible);
	}

	add_info_text(svg) {
		return svg.append("text")
		.on("click", _ => {
			this.editing_div.selectAll("form").remove();
			this.create_info_form();
		})
		.attr("cursor", "pointer")
		.attr("class", "info-text")
		.attr("x", svg.attr("width")-16)
		.attr("y", "24pt")
		.text("ⓘ");
	}
};

function get_node_size() {
	return 28;
}

function add_images(group) {
	// Use the node's ID as path ID
	function get_clip_path_id(node) {
		return "clip_to_circle_" + node.data;
	};
	// Add path and image
	group.append("defs")
		.append("clipPath")
		.attr("id", node => get_clip_path_id(node))
		.append("circle")
		.attr("r", get_node_size() - 1.0);
	let image_size = 2.0 * get_node_size();
	group.append("image")
		.attr("x", -image_size / 2.0)
		.attr("y", -image_size / 2.0)
		.attr("width", image_size)
		.attr("height", image_size)
		.attr("xlink:href", node => get_image_path(node))
		.attr("clip-path", node => "url(#" + get_clip_path_id(node) + ")")
		.attr("cursor", "pointer");
}

function set_multiline(d3_element, node, edit_mode = true) {
	// Get an array from given string
	function get_array(name_string) {
		let names = name_string.match(/[^\s]+/gi);
		if (!names) return [];
		return names;
	}
	// Special handling for titles
	function is_special(text) {
		for (let word of ["Heilige",
			"Freiherr",
			"Graf",
			"der",
			"von",
			"zu",
			"bei",
			"Dr.",
			"med.",
			"Dr",
			"med",
			"St.",
			"St"]) {
			if (text == word) return true;
		}
		for (let symbol of [".", "/", "-", "(", ")"]) {
			if (text.includes(symbol)) return true;
		}
		return false;
	}

	function get_all_names_text(node) {
		let names = get_array(get_name(node));
		let second_names = get_array(get_second_names(node));
		let second_name_unique = second_names.length < 2;
		let all_names = names[0]; // always exists
		for (let i = 0; i < second_names.length; i++) {
			if (second_names[i] == "") continue;
			if (second_name_unique || (is_special(second_names[i])))
				all_names += " " + second_names[i];
			else
				all_names += " " + second_names[i][0] + ".";
		}
		for (let i = 1; i < names.length; i++) {
			all_names += " " + names[i];
		}
		return all_names;
	}

	function get_birth_and_death_text(node) {
		let birth_date = get_birth_date(node);
		let death_date = get_death_date(node);
		return birth_date + (death_date != "" ? " - " + death_date : "");
	}

	function get_occupation_text(node) {
		return get_occupation(node);
	}

	function get_note_text(node) {
		return get_note(node);
	}

	function get_places_and_marriage_text(node) {
		let birth_place = get_birth_place(node);
		let death_place = get_death_place(node);
		let marriage = get_marriage(node);
		let birth_and_death_place = "";
		if (birth_place == death_place) {
			birth_and_death_place = birth_place;
			birth_place = death_place = "";
		}
		let text = "";
		if (birth_and_death_place != "")
			text += (text != "" ? " " : "") + "*† " + birth_and_death_place;
		if (birth_place != "") text += (text != "" ? " " : "") + "* " + birth_place;
		if (death_place != "") text += (text != "" ? " " : "") + "† " + death_place;
		if (marriage != "") text += (text != "" ? " " : "") + "⚭ " + marriage;
		return text;
	}

	function get_label(node, edit_mode) {
		if (!is_member(node)) return [];
		let all_names = get_all_names_text(node);
		let birth_and_death = get_birth_and_death_text(node);
		let occupation = get_occupation_text(node);
		let places_and_marriage = get_places_and_marriage_text(node);
		let note = get_note_text(node);
		let lines = [all_names];
		if (birth_and_death != "") lines.push(birth_and_death);
		if ((occupation != "") && edit_mode) lines.push(occupation);
		if ((places_and_marriage != "") && edit_mode) lines.push(places_and_marriage);
		if ((note != "") && edit_mode) lines.push(note);
		return lines;
	}
	// Remove any previous text
	d3_element.selectAll("text.node-label").remove();
	let lines = get_label(node, edit_mode);
	if (lines.length < 1) return;
	let d3_text =
		d3_element.append("text").attr("class", "node-label").attr("dominant-baseline", "central");
	let line_sep = 14;
	let line_offset = -line_sep * (lines.length - 1) / 2;
	for (let i = 0; i < lines.length; i++) {
		let line_text = lines[i];
		let line_length = 40;
		if (line_text.length > line_length) {
			line_text = line_text.substring(0, line_length - 3) + "...";
		}
		let d3_tspan = d3_text.append("tspan")
			.text(line_text)
			.attr("dy", i == 0 ? line_offset : line_sep)
			.attr("x", get_node_size() + 8);
		if (i >= 2) d3_tspan.attr("fill-opacity", 0.5).attr("font-size", "75%");
	}
}
