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

    let baseWidth = 960, baseHeight = 600;
    let root = d3.hierarchy(data);
    let maxDepth = root.height;
    let width = orientation === "horizontal" ? Math.max(baseWidth, maxDepth * 200) : baseWidth;
    let height = baseHeight;

    let svg = d3.select("svg").attr("width", width).attr("height", height);
    let g = svg.append("g").attr("transform", orientation === "horizontal" ? "translate(100,50)" : "translate(50,50)");

    let treeLayout = d3.tree().size(orientation === "horizontal" ? [height - 100, width - 200] : [width - 100, height - 100]);

    root.x0 = height / 2;
    root.y0 = 0;

    function update(source) {
        let treeData = treeLayout(root);
        let nodes = treeData.descendants();
        let links = treeData.links();

        nodes.forEach(d => {
            d.y = orientation === "horizontal" ? d.depth * 180 : d.y;
        });

        let node = g.selectAll(".node")
            .data(nodes, d => d.id || (d.id = ++i));

        let nodeEnter = node.enter().append("g")
            .attr("class", "node")
            .attr("transform", d => `translate(${source.y0},${source.x0})`)
            .on("click", (event, d) => toggleNode(d)) // Collapse/Expand
            .on("mouseover", function (event, d) { d3.select(this).select("circle").style("fill", "orange"); })
            .on("mouseout", function (event, d) { d3.select(this).select("circle").style("fill", "steelblue"); });

        nodeEnter.append("circle")
            .attr("r", 6)
            .style("cursor", "pointer");

        nodeEnter.append("text")
            .attr("dy", -10)
            .attr("text-anchor", "middle")
            .text(d => d.data.name);

        let nodeUpdate = nodeEnter.merge(node);
        nodeUpdate.transition()
            .duration(500)
            .attr("transform", d => `translate(${d.y},${d.x})`);

        let link = g.selectAll(".link")
            .data(links, d => d.target.id);

        let linkEnter = link.enter().insert("line", "g")
            .attr("class", "link")
            .attr("x1", d => source.y0)
            .attr("y1", d => source.x0)
            .attr("x2", d => source.y0)
            .attr("y2", d => source.x0)
            .style("stroke", "#ccc")
            .style("stroke-width", "1.5px");

        let linkUpdate = linkEnter.merge(link);
        linkUpdate.transition()
            .duration(500)
            .attr("x1", d => d.source.y)
            .attr("y1", d => d.source.x)
            .attr("x2", d => d.target.y)
            .attr("y2", d => d.target.x);

        nodes.forEach(d => {
            d.x0 = d.x;
            d.y0 = d.y;
        });
    }

    let i = 0;
    root.children.forEach(collapse);
    update(root);

    function collapse(d) {
        if (d.children) {
            d._children = d.children;
            d._children.forEach(collapse);
            d.children = null;
        }
    }

    function toggleNode(d) {
        if (d.children) {
            d._children = d.children;
            d.children = null;
        } else {
            d.children = d._children;
            d._children = null;
        }
        update(d);
    }
}




