async function loadXMLFiles(files, orientation) {
    let parser = new DOMParser();
    let trees = [];

    for (let file of files) {
        let response = await fetch(file);
        let text = await response.text();
        let xml = parser.parseFromString(text, "application/xml");
        trees.push(xmlToJSON(xml.documentElement));
    }

    let combinedTree = { name: "OSS", children: trees };
    renderTree(combinedTree, orientation);
}

function xmlToJSON(xml) {
    let nodeName = xml.getAttribute("name") || xml.nodeName;
    let obj = { name: nodeName, children: [] };

    for (let node of xml.children) {
        obj.children.push(xmlToJSON(node));
    }

    return obj;
}

function renderTree(data, orientation) {
    d3.select("svg").selectAll("*").remove();

    let width = 960, height = 600;
    let svg = d3.select("svg").attr("width", width).attr("height", height);
    let g = svg.append("g").attr("transform", orientation === "horizontal" ? "translate(100,50)" : "translate(50,50)");

    let treeLayout;
    if (orientation === "horizontal") {
        treeLayout = d3.tree().size([height - 100, width - 100]);  // Left-to-right
    } else {
        treeLayout = d3.tree().size([width - 100, height - 100]);  // Top-to-bottom
    }

    let root = d3.hierarchy(data);
    treeLayout(root);

    let link = g.selectAll(".link")
        .data(root.links())
        .enter().append("line")
        .attr("class", "link")
        .attr("x1", d => orientation === "horizontal" ? d.source.y : d.source.x)
        .attr("y1", d => orientation === "horizontal" ? d.source.x : d.source.y)
        .attr("x2", d => orientation === "horizontal" ? d.target.y : d.target.x)
        .attr("y2", d => orientation === "horizontal" ? d.target.x : d.target.y);

    let node = g.selectAll(".node")
        .data(root.descendants())
        .enter().append("g")
        .attr("class", "node")
        .attr("transform", d => orientation === "horizontal" ? `translate(${d.y},${d.x})` : `translate(${d.x},${d.y})`);

    node.append("circle").attr("r", 6);
    node.append("text").attr("dy", -10).attr("text-anchor", "middle").text(d => d.data.name);
}
