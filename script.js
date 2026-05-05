// Data types definition
const dataTypes = [
    {
        name: 'string',
        definition: 'Represents a sequence of characters',
        format: 'Text',
        example: 'Main Street'
    },
    {
        name: 'number',
        definition: 'Represents a numeric value (integer or decimal)',
        format: 'Numeric',
        example: '123.45'
    },
    {
        name: 'boolean',
        definition: 'Represents a true or false value',
        format: 'true | false',
        example: 'true'
    },
    {
        name: 'date',
        definition: 'Represents a date value',
        format: 'YYYY-MM-DD',
        example: '2026-01-20'
    },
    {
        name: 'datetime',
        definition: 'Represents a date and time value',
        format: 'YYYY-MM-DDTHH:MM',
        example: '2026-01-20T12:00'
    },
    {
        name: 'geometry',
        definition: 'Represents spatial/geographic data',
        format: 'WKT, Shapefile, or GeoJSON',
        example: 'LINESTRING (0 0, 1 1, 2 2)'
    }
];

// State
let yamlData = null;
let currentTableId = null;
const fileName = document.body.dataset.file;


// Initialize
document.addEventListener('DOMContentLoaded', function () {
    loadYAMLData();
    setupEventListeners();
    handleUrlHash();
});

// Load YAML data and store in globally accessible variable and render sidebar
const loadYAMLData = () => {
    fetch(fileName)
        .then(response => response.text())
        .then(text => {
            yamlData = jsyaml.load(text);
            document.getElementById('welcomeMessageTitle').innerHTML = yamlData.title + ' Data Specifications' || 'Data Specification';
            renderSidebar();
        })
        .catch(error => {
            console.error('Error loading YAML:', error);
            document.getElementById('welcomeMessage').innerHTML =
                '<div class="alert alert-danger">Error loading data specification. Please ensure highways.yaml is in the same directory.</div>';
        });
}

// Setup event listeners
const setupEventListeners = () => {
    // Search functionality
    document.getElementById('searchInput').addEventListener('input', handleSearch);

    // Handle browser back/forward
    window.addEventListener('hashchange', handleUrlHash);
}

// Handle URL hash when browser back/forward buttons are used
const handleUrlHash = () => {
    const hash = window.location.hash.slice(1);
    if (hash && yamlData) {
        loadTable(hash);
        updateActiveLink(hash);
    }
}

// Render sidebar navigation
const renderSidebar = () => {
    const sidebarNav = document.getElementById('sidebarNav');
    const sidebarTitle = document.getElementById('sidebarTitle').innerHTML = yamlData.title + ' Data Specification' || 'Data Specification';
    sidebarNav.innerHTML = '';

    // Add Data Types section first
    const dataTypesSection = createSection('Data Types', 'dataTypes', [
        { id: 'dataTypes', name: 'Data Types Reference' }
    ]);
    sidebarNav.appendChild(dataTypesSection);
    // Add table groups
    if (yamlData.groups) {
        yamlData.groups.forEach(group => {
            const tables = group.tables.map(tableId => {
                const tableData = yamlData.tables[tableId];
                return tableData ? { id: tableId, name: tableData.name || tableId } : null;
            }).filter(t => t !== null);

            if (tables.length > 0) {
                const section = createSection(group.label, group.label, tables);
                sidebarNav.appendChild(section);
            }
        });
    }

}

// Create collapsible section
const createSection = (label, sectionId, items) => {
    const section = document.createElement('div');
    section.className = 'nav-section';

    // Section header
    const header = document.createElement('div');
    header.className = 'section-header';
    header.innerHTML = `
        <span>${label}</span>
        <i class="bi bi-chevron-down"></i>
    `;
    header.addEventListener('click', () => toggleSection(sectionId));

    // Nav items
    const navItems = document.createElement('div');
    navItems.className = 'nav-items collapse show';
    navItems.id = `section-${sectionId}`;

    items.forEach(item => {
        const link = document.createElement('a');
        link.href = `#${item.id}`;
        link.className = 'nav-link';
        link.textContent = item.name;
        link.setAttribute('data-table-id', item.id);
        link.addEventListener('click', (e) => {
            e.preventDefault();
            loadTable(item.id);
            updateActiveLink(item.id);
            window.location.hash = item.id;
        });
        navItems.appendChild(link);
    });

    section.appendChild(header);
    section.appendChild(navItems);
    return section;
}

// Toggle section collapse
const toggleSection = (sectionId) => {
    const section = document.getElementById(`section-${sectionId}`);
    const header = section.previousElementSibling;

    if (section.classList.contains('show')) {
        section.classList.remove('show');
        header.classList.add('collapsed');
    } else {
        section.classList.add('show');
        header.classList.remove('collapsed');
    }
}

// Update active link
const updateActiveLink = (tableId) => {
    document.querySelectorAll('.nav-link').forEach(link => {
        link.classList.remove('active');
    });
    const activeLink = document.querySelector(`[data-table-id="${tableId}"]`);
    if (activeLink) {
        activeLink.classList.add('active');
    }
}



// Load table content
const loadTable = (tableId) => {
    currentTableId = tableId;
    const contentDiv = document.getElementById('tableContent');
    const welcomeDiv = document.getElementById('welcomeMessage');

    welcomeDiv.style.display = 'none';
    contentDiv.style.display = 'block';

    if (tableId === 'dataTypes') {
        renderDataTypes();
        return;
    }

    const table = yamlData.tables[tableId];
    if (!table) {
        contentDiv.innerHTML = '<div class="alert alert-warning">Table not found</div>';
        return;
    }

    contentDiv.innerHTML = renderTable(table, tableId);
    tippy('.field-name-cell')
}

// Render table content
const renderTable = (table, tableId) => {
    const isLookup = tableId === 'Lookups';

    let html = `
        <div class="table-header">
            <h1>${table.name || tableId}</h1>
            ${table.description ? `<div style="white-space: pre-line" class="table-description">${table.description}</div>` : ''}
        </div>
    `;
    if (isLookup) {
        html += renderLookups(table.fields);
    } else {
        html += renderFields(table.fields);
    }

    return html;
}

// Render regular table fields
const renderFields = (fields) => {
    let html = `
        <div class="fields-table-container">
            <table class="table table-hover fields-table">
                <thead>
                    <tr>
                        <th>Field Name</th>
                        <!--<th>Description</th>-->
                        <th>Type</th>
                        <th>Required</th>
                        <th>Unique</th>
                        <th>Min</th>
                        <th>Max</th>
                        <th>Decimals</th>
                        <th>Accepted Values</th>
                        <th>Remarks</th>
                    </tr>
                </thead>
                <tbody>
    `;

    fields.forEach(field => {
        html += `
            <tr>
                <td class="field-name-cell" style="text-decoration: underline;" data-tippy-content="${field.description}">${field.name}</td>
                <!--<td class="description-cell">${field.description || '-'}</td>-->
                <td class="type-cell"><code>${field.type || '-'}</code></td>
                <td class="centered-cell">${field.required ? '<span class="badge badge-yes">Yes</span>' : '<span class="badge badge-no">No</span>'}</td>
                <td class="centered-cell">${field.unique ? '<span class="badge badge-yes">Yes</span>' : '<span class="badge badge-no">No</span>'}</td>
                <td class="centered-cell">${field.min ?? ''}</td>
                <td class="centered-cell">${field.max ?? ''}</td>
                <td class="centered-cell">
                ${field.decimals === true
                                ? '<span class="badge badge-yes">Yes</span>'
                                : field.decimals === false
                                    ? '<span class="badge badge-no">No</span>'
                                    : ''
                            }
                </td>
                <td class="values-cell">${field.acceptedValues ? processAcceptedValues(field.acceptedValues) : ''}</td>
                <td class="remarks-cell">${field.remarks || ''}</td>
            </tr>
        `;
    });

    html += `
                </tbody>
            </table>
        </div>
    `;
    return html;
}

// Process accepted values to create links
const processAcceptedValues = (value) => {
    if (!value) return '';
    // Check if it contains LinkTo:
    const matches = [...value.matchAll(/LinkTo:([a-z-]+)/g)];
    const links = matches.map(m => m[1]);
    if (links.length > 0) {
        for (const link of links) {
            try {
                const targetTableName = yamlData.tables[link].name
                value = value.replace(`LinkTo:${link}`, `<a href="#${link}" onclick="loadTable('${link}'); updateActiveLink('${link}'); return true;">${targetTableName}</a>`);

            }
            catch (e) {
                value = value.replace(`LinkTo:${link}`, `<a href="#${link}" onclick="loadTable('${link}'); updateActiveLink('${link}'); return true;">***${link}</a>`);
            }
        }
        return value
    }
    /*
    const linkMatch = value.match(/LinkTo:([a-z-]+)/);
    if (linkMatch) {
        console.log(linkMatch)
        const targetTable = linkMatch[1];
        try {
            console.log(targetTable)
            const targetTableName = yamlData.tables[targetTable].name

            value = value.replace(`LinkTo:${targetTable}`, `<a href="#${targetTable}" onclick="loadTable('${targetTable}'); updateActiveLink('${targetTable}'); return true;">${targetTableName}</a>`);
            return value
        } catch (e) {
            value = value.replace(`LinkTo:${targetTable}`, `<a href="#${targetTable}" onclick="loadTable('${targetTable}'); updateActiveLink('${targetTable}'); return true;">***${targetTable}</a>`);
            return value
        }
    }
    */
    const lookupTable = yamlData.tables['Lookups'];
  
    if (!lookupTable) return value;
    const lookupField = lookupTable.fields.find(f => f.name === value);
    if (!lookupField) return value;
    value = '';
    lookupField.values.forEach(v => value += `<span class="badge bg-secondary me-1">${v}</span>`);
    return value;
}

// Render lookup tables
const renderLookups = (fields) => {
    let html = '<div class="lookup-table">';

    fields.forEach(field => {
        html += `
            <div class="lookup-section">
                <h3 class="lookup-header">${field.name}</h3>
                <div class="lookup-values">
                    <ul>
                        ${field.values.map(v => `<li>${v}</li>`).join('')}
                    </ul>
                </div>
            </div>
        `;
    });

    html += '</div>';
    return html;
}

// Render data types table
const renderDataTypes = () => {
    const contentDiv = document.getElementById('tableContent');

    let html = `
        <div class="table-header">
            <h1>Data Types Reference</h1>
            <div class="table-description">
                This table describes the data types used throughout the specification, including their expected format and examples.
            </div>
        </div>
        <div class="data-types-table">
            <table class="table">
                <thead>
                    <tr>
                        <th>Data Type</th>
                        <th>Definition</th>
                        <th>Expected Format</th>
                        <th>Example</th>
                    </tr>
                </thead>
                <tbody>
    `;

    dataTypes.forEach(type => {
        html += `
            <tr>
                <td><code>${type.name}</code></td>
                <td>${type.definition}</td>
                <td><code>${type.format}</code></td>
                <td><code>${type.example}</code></td>
            </tr>
        `;
    });

    html += `
                </tbody>
            </table>
        </div>
    `;

    contentDiv.innerHTML = html;
}

// Search functionality
const handleSearch = (e) => {
    const searchTerm = e.target.value.toLowerCase();
    const navLinks = document.querySelectorAll('.nav-link');

    navLinks.forEach(link => {
        const tableName = link.textContent.toLowerCase();
        const tableId = link.getAttribute('data-table-id');

        if (tableName.includes(searchTerm) || tableId.includes(searchTerm)) {
            link.style.display = 'block';
            // Expand parent section
            const navItems = link.closest('.nav-items');
            if (navItems && !navItems.classList.contains('show')) {
                navItems.classList.add('show');
                navItems.previousElementSibling.classList.remove('collapsed');
            }
        } else {
            link.style.display = 'none';
        }
    });
}
