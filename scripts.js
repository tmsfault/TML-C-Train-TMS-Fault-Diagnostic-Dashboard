// scripts.js
const tableHeader = document.getElementById('table-header');
const tableBody = document.getElementById('table-body');
const paginationContainer = document.getElementById('pagination-container');
const filterContainer = document.getElementById('filter-container');

// Global data array to store CSV data
let globalData = [];
let popupCount = 0; // Initialize popup count to 0
let popupArray = []; // Initialize popup array
let filteredData = [];
let currentPage = 1;
let rowsPerPage = 10;
let totalPages = 0;
let hiddenData = [];
let tableHeaders;
let selectedFilter = 'All';
let popupStyle = localStorage.getItem('popupStyle') || 'tree';
const codeRegex = /([~])?[A-Z]{2}[A-Z0-9]?\s?\d{3}(?= |$|&|,|>=|#| |>|=|<|<=|-|==|)/g;
const codeRegex2 = /([~])?[A-Z]+-[A-Z0-9]?\s?\d{3}(?= |$|&|,|>=|#| |>|=|<|<=|-|==|)/g;
let darkMode = localStorage.getItem('darkMode') || 'disabled';
const faultNoPrefixes = {};

let circuitDiagrams = {
  'TMS': 'https://tmsfault.github.io/TML-C-Train-TMS-Fault-Diagnostic-Dashboard/circuits/TMS.pdf',
  'CAB': 'https://tmsfault.github.io/TML-C-Train-TMS-Fault-Diagnostic-Dashboard/circuits/CAB.pdf',
  'VOBC': 'https://tmsfault.github.io/TML-C-Train-TMS-Fault-Diagnostic-Dashboard/circuits/VOBC.pdf',
  'BRAKE': 'https://tmsfault.github.io/TML-C-Train-TMS-Fault-Diagnostic-Dashboard/circuits/BRAKE.pdf',
  'CI': 'https://tmsfault.github.io/TML-C-Train-TMS-Fault-Diagnostic-Dashboard/circuits/CI.pdf',
  'APS': 'https://tmsfault.github.io/TML-C-Train-TMS-Fault-Diagnostic-Dashboard/circuits/APS.pdf',
  'DCU U': 'https://tmsfault.github.io/TML-C-Train-TMS-Fault-Diagnostic-Dashboard/circuits/DCU.pdf',
  'DCU D': 'https://tmsfault.github.io/TML-C-Train-TMS-Fault-Diagnostic-Dashboard/circuits/DCU.pdf',
  'VAC1': 'https://tmsfault.github.io/TML-C-Train-TMS-Fault-Diagnostic-Dashboard/circuits/VAC.pdf',
  'VAC2': 'https://tmsfault.github.io/TML-C-Train-TMS-Fault-Diagnostic-Dashboard/circuits/VAC.pdf',
  'MC': 'https://tmsfault.github.io/TML-C-Train-TMS-Fault-Diagnostic-Dashboard/circuits/PIS.pdf',
  'RADIO': 'https://tmsfault.github.io/TML-C-Train-TMS-Fault-Diagnostic-Dashboard/circuits/RADIO.pdf',
  'ETC': 'https://tmsfault.github.io/TML-C-Train-TMS-Fault-Diagnostic-Dashboard/circuits/ETC.pdf',
  'HADS': 'https://tmsfault.github.io/TML-C-Train-TMS-Fault-Diagnostic-Dashboard/circuits/HADS.pdf',
  'ORIS': 'https://tmsfault.github.io/TML-C-Train-TMS-Fault-Diagnostic-Dashboard/circuits/ORIS.pdf',
  'SMD': 'https://tmsfault.github.io/TML-C-Train-TMS-Fault-Diagnostic-Dashboard/circuits/SMD.pdf',
  'DVAU': 'https://tmsfault.github.io/TML-C-Train-TMS-Fault-Diagnostic-Dashboard/circuits/DVAU.pdf',
  'VBC': 'https://tmsfault.github.io/TML-C-Train-TMS-Fault-Diagnostic-Dashboard/circuits/PIS.pdf',
  'TNI': 'https://tmsfault.github.io/TML-C-Train-TMS-Fault-Diagnostic-Dashboard/circuits/PIS.pdf',
  'DI': 'https://tmsfault.github.io/TML-C-Train-TMS-Fault-Diagnostic-Dashboard/circuits/PIS.pdf',
};

initData();

function initData() {
  showSpinner();
  fetch('https://raw.githubusercontent.com/tmsfault/TML-C-Train-TMS-Fault-Diagnostic-Dashboard/main/fault_data.csv')
    .then(response => response.text())
    .then(csvData => {
      const csvRows = csvData.split('\n');
      tableHeaders = csvRows[0].split(/,(?=(?:[^"]*"[^"]*")*[^"]*$)/).map(header => header.trim().replace(/^"|"$/g, ''));
      let hideRows = false; // Initialize the hide rows flag
      globalData = []; // Reset global data
      hiddenData = [];
      
      for (let i = 1; i < csvRows.length; i++) {
        const row = csvRows[i].split(/,(?=(?:[^"]*"[^"]*")*[^"]*$)/);
        const rowData = {};

        for (let j = 0; j < row.length; j++) {
          rowData[tableHeaders[j]] = row[j].trim().replace(/^"|"$/g, '');
        }

        if (row[0].startsWith('-')) {
          hideRows = true;
        }

        if (hideRows) {
          rowData['hidden'] = true;
          hiddenData.push(rowData);
        }

        globalData.push(rowData);
      }
      filteredData=globalData; //initialize filteredData with globalData
      createFilter();
      hideSpinner();
      createTable(tableHeaders, globalData);

    });
    // return tableHeaders;
}

// console.log(tableHeaders);

function createFilter() {
  const filterContainer = document.getElementById('filter-container');
  filterContainer.innerHTML = ''; // Clear any existing filter buttons

  const visibleRows = globalData.filter(row => !row['hidden']);
  const faultNos = visibleRows.map(row => row['Fault No.']);

  
  faultNos.forEach((faultNo) => {
    const prefix = faultNo.split('-')[0];
    if (!faultNoPrefixes[prefix]) {
      faultNoPrefixes[prefix] = [];
    }
    faultNoPrefixes[prefix].push(faultNo);
  });

  const filterTabs = ['All', ...Object.keys(faultNoPrefixes)]; // Add 'All' and unique fault no prefixes to filter tabs

  filterTabs.forEach((filter) => {
    const filterTab = document.createElement('button');
    filterTab.className = 'filter-button';
    filterTab.textContent = filter;
    filterContainer.appendChild(filterTab);

    filterTab.addEventListener('click', () => {
      selectedFilter = filter; // Update the selected filter
      showSpinner(); // Show the spinner before updating the table and pagination

      setTimeout(() => {
        if (filter === 'All') {
          filteredData = globalData;
        } else {
          const prefix = filter;
          filteredData = globalData.filter((row) => row['Fault No.'].startsWith(prefix + '-'));
        }
        hiddenData = globalData.filter(row => row['hidden']); // Update hiddenData array
        currentPage = 1; // Reset current page to 1 when filter changes

        // Call searchTable() to handle search filtering
        searchTable({ target: document.getElementById('search-input') });

        createTable(tableHeaders, filteredData);
        createPagination();

        hideSpinner(); // Hide the spinner after the table and pagination have been updated
      }, 20); // Adjust the timeout duration as needed
    });
  });
}

function colorSelectedFilter(){
  // Color the selected filter button
  filterContainer.querySelectorAll('.filter-button').forEach((tab) => {
    if (tab.textContent === selectedFilter) {
      tab.style.background = '#727578';
      tab.style.color = '#fff';
    } else {
      tab.style.background = '';
      tab.style.color = '';
    }
  });
}


function createTable(tableHeaders, data) {
  const tableHeaderRow = document.createElement('tr');

  for (let i = 0; i < tableHeaders.length; i++) {
      const tableHeaderCell = document.createElement('th');
      tableHeaderCell.textContent = tableHeaders[i];
      tableHeaderRow.appendChild(tableHeaderCell);
  }

  let visibleData = data.filter(row => !row['hidden']);
  totalPages = Math.ceil(visibleData.length / rowsPerPage);

  const startIndex = (currentPage - 1) * rowsPerPage;
  const endIndex = startIndex + rowsPerPage;

  const tableRows = visibleData.slice(startIndex, endIndex);

  tableHeader.innerHTML = '';
  tableHeader.appendChild(tableHeaderRow);
  tableBody.innerHTML = ''; // Clear the table body

  tableRows.forEach((row) => {
      if (row['hidden']) { // If the row is marked as hidden, skip it
          return;
      }
      const tableRow = document.createElement('tr');

      for (let i = 0; i < tableHeaders.length; i++) {
          const tableCell = document.createElement('td');
          tableCell.textContent = row[tableHeaders[i]] !== undefined ? row[tableHeaders[i]] : '';

          // Add event listener to cells that contain references to other rows
          if (['D1', 'D2', 'D3', 'D4', 'D5', 'D6', 'D7', 'D8', 'D9', 'C1'].some((column) => row[column] === tableCell.textContent)) {
              const faultNos = hiddenData.map((row) => row['Fault No.']);
              const text = tableCell.textContent.replace(/^~/, ''); // Remove leading ~ character
              const hasTilde = tableCell.textContent.startsWith('~'); // Check if the cell value starts with ~
              const references = text.includes(' U ')? text.split(' U ').filter(Boolean) : [text];
              if (faultNos.some((faultNo) => references.includes(faultNo)) && text.trim()!== '') {
                  tableCell.innerHTML = references.map((ref, index) => {
                      let refHtml = '';
                      const refRow = hiddenData.find((r) => r['Fault No.'] === ref);
                      const refFaultName = refRow ? refRow['Fault Name'] : ''; // Get the fault name of the reference
                      if (faultNos.includes(ref)) {
                          if (popupStyle === 'tree') {
                              refHtml = `<span class="tooltip-wrapper"><u onclick="showTreePopup('${ref}', ${hasTilde}, '${row['Fault No.']}')">${hasTilde? `~${ref}` : ref}</u><span class="tooltip"><span class="tooltiptext">${hasTilde? `~${refFaultName}` : refFaultName}</span></span></span>`;
                          } else if (popupStyle === 'sitemap'){
                              refHtml = `<span class="tooltip-wrapper"><u onclick="showSitemapPopup('${ref}', ${hasTilde}, '${row['Fault No.']}')">${hasTilde? `~${ref}` : ref}</u><span class="tooltip"><span class="tooltiptext">${hasTilde? `~${refFaultName}` : refFaultName}</span></span></span>`;
                          } else {
                              refHtml = `<span class="tooltip-wrapper"><u onclick="showPopup('${ref}', ${hasTilde}, '${row['Fault No.']}')">${hasTilde? `~${ref}` : ref}</u><span class="tooltip"><span class="tooltiptext">${hasTilde? `~${refFaultName}` : refFaultName}</span></span></span>`;
                          }
                      } else {
                          refHtml = `<span>${ref}</span>`;
                      }
                      if (index < references.length - 1) {
                          refHtml += ' U '; // Add ' U ' after each reference except the last one
                      }
                      return refHtml;
                  }).join('');
                  Array.from(tableCell.children).forEach((child) => {
                      if (child.tagName === 'SPAN' && child.onclick) {
                          child.style.cursor = 'pointer'; // Change the cursor to a pointer on hover for clickable spans
                      }
                  });
              }
          } else {
              tableCell.style.textDecoration = 'none'; // Remove underline for non-clickable text
          }
          tableRow.appendChild(tableCell);
      }

      tableBody.appendChild(tableRow);
  });
  document.querySelector('.table-container').scrollTo(0, 0);
  createPagination(); // Create pagination controls
  colorSelectedFilter(); // Color the selected filter button
   // Adjust tooltip positions
   adjustTooltips();
}

function adjustTooltips() {
  document.querySelectorAll('.tooltip-wrapper').forEach(wrapper => {
    const tooltip = wrapper.querySelector('.tooltiptext');

    // Remove previously added positioning classes
    tooltip.classList.remove('tooltip-right-edge'); // Add more if you have other classes for different positions

    const rect = tooltip.getBoundingClientRect();
    const tableRect = wrapper.closest('table').getBoundingClientRect();

    if (rect.right > tableRect.right) {
      tooltip.style.left = 'auto';
      tooltip.style.right = '0';
      tooltip.style.transform = 'translateX(0)';
      tooltip.classList.add('tooltip-right-edge'); // Adjust the arrow position for right edge
    } else {
      tooltip.style.left = '50%';
      tooltip.style.right = 'auto';
      tooltip.style.transform = 'translateX(-50%)';
      // Remove the class if not needed, or adjust based on other conditions
    }
  });
}

// Add event listeners to each icon
document.querySelectorAll('.switch-container span').forEach((icon, index) => {
  icon.addEventListener('click', () => {
      // Remove the active class from all icons
      document.querySelectorAll('.switch-container span').forEach(i => i.classList.remove('active'));
      // Add the active class to the clicked icon
      icon.classList.add('active');
      // Update the popup style
      popupStyle = icon.getAttribute('data-style');
      // Save the popup style to local storage
      localStorage.setItem('popupStyle', popupStyle);
      // Move the slider to the clicked icon's position
      const slider = document.querySelector('.slider');
      slider.style.left = `${index * 33.33}%`;
      // Re-create the table with the new popup style
      createTable(tableHeaders, filteredData);
  });
});

// On page load, set the active icon and move the slider accordingly
document.addEventListener('DOMContentLoaded', function() {
  const icons = document.querySelectorAll('.switch-container span');
  const slider = document.querySelector('.slider');

  // Find the icon that matches the saved popup style
  const activeIcon = Array.from(icons).find(icon => icon.getAttribute('data-style') === popupStyle);

  if (activeIcon) {
      // Add the active class to the icon
      activeIcon.classList.add('active');
      // Move the slider to the active icon's position
      const index = Array.from(icons).indexOf(activeIcon);
      slider.style.left = `${index * 33.33}%`;
  }
});


function createPagination() {
  paginationContainer.innerHTML = '';

  const rowsPerPageSelect = document.createElement('select');
  rowsPerPageSelect.id = 'rows-per-page-select';
  rowsPerPageSelect.style.marginRight = '10px';
  
  const rowsPerPageOptions = [10, 25, 50, "All"];
  rowsPerPageOptions.forEach((option) => {
    const optionElement = document.createElement('option');
    if (option === "All") {
      optionElement.value = globalData.filter(row =>!row['hidden']).length;
      optionElement.textContent = "All rows";
    } else {
      optionElement.value = option;
      optionElement.textContent = `${option} rows`;
    }
    rowsPerPageSelect.appendChild(optionElement);
  });

  rowsPerPageSelect.value = rowsPerPage;
  rowsPerPageSelect.addEventListener('change', (e) => {
    rowsPerPage = parseInt(e.target.value);
    const filteredDataTemp = filteredData.filter(row => !row['hidden']); // Filtered data based on current filter
    const totalPagesNew = Math.ceil(filteredDataTemp.length / rowsPerPage);
    currentPage = Math.min(currentPage, totalPagesNew); // Ensure currentPage doesn't exceed totalPagesNew
  
    showSpinner(); // Show the spinner before creating the table
    setTimeout(() => {
      createTable(tableHeaders, filteredData);
      hideSpinner(); // Hide the spinner after the table has been created
    }, 20); // Adjust the timeout duration as needed
  });
 
  paginationContainer.appendChild(rowsPerPageSelect);

  const firstPageButton = document.createElement('a');
  firstPageButton.href = '#';
  firstPageButton.innerHTML = '<i class="fa fa-angle-double-left" aria-hidden="true"></i>';
  firstPageButton.className = 'pagination-link';
  firstPageButton.addEventListener('click', (e) => {
    e.preventDefault();
    currentPage = 1;
    createTable(tableHeaders, filteredData);
  });
  paginationContainer.appendChild(firstPageButton);

  const previousPageButton = document.createElement('a');
  previousPageButton.href = '#';
  previousPageButton.innerHTML = '<i class="fa fa-angle-left" aria-hidden="true"></i>';
  previousPageButton.className = 'pagination-link';
  previousPageButton.addEventListener('click', (e) => {
    e.preventDefault();
    if (currentPage > 1) {
      currentPage--;
      createTable(tableHeaders, filteredData);
    }
  });
  paginationContainer.appendChild(previousPageButton);

  if (totalPages <= 5) {
    for (let i = 1; i <= totalPages; i++) {
      const paginationLink = document.createElement('a');
      paginationLink.href = '#';
      paginationLink.textContent = i;
      paginationLink.className = 'pagination-link';
      if (i === currentPage) {
        paginationLink.className += ' active';
      }

      paginationLink.addEventListener('click', (e) => {
        e.preventDefault();
        currentPage = i;
        createTable(tableHeaders, filteredData);
      });
      paginationContainer.appendChild(paginationLink);
    }
  } else if (currentPage <= 3) {
    for (let i = 1; i <= 5; i++) {
      const paginationLink = document.createElement('a');
      paginationLink.href = '#';
      paginationLink.textContent = i;
      paginationLink.className = 'pagination-link';
      if (i === currentPage) {
        paginationLink.className += ' active';
      }

      paginationLink.addEventListener('click', (e) => {
        e.preventDefault();
        currentPage = i;
        createTable(tableHeaders, filteredData);
      });
      paginationContainer.appendChild(paginationLink);
    }

    const ellipsisRight = document.createElement('span');
    ellipsisRight.textContent = ' ... ';
    // ellipsisRight.style.color = 'gray';
    ellipsisRight.className = 'pagination-ellipsis';
    ellipsisRight.style.border = 'none';
    ellipsisRight.style.cursor = 'default';
    ellipsisRight.style.pointerEvents = 'none'; // Add this line to prevent clicking
    paginationContainer.appendChild(ellipsisRight);

    const lastPageLink = document.createElement('a');
    lastPageLink.href = '#';
    lastPageLink.textContent = totalPages;
    lastPageLink.className = 'pagination-link';
    lastPageLink.addEventListener('click', (e) => {
      e.preventDefault();
      currentPage = totalPages;
      createTable(tableHeaders, filteredData);
    });
    paginationContainer.appendChild(lastPageLink);
  } else if (currentPage >= totalPages - 2) {
    const firstPageLink = document.createElement('a');
    firstPageLink.href = '#';
    firstPageLink.textContent = 1;
    firstPageLink.className = 'pagination-link';
    firstPageLink.addEventListener('click', (e) => {
      e.preventDefault();
      currentPage = 1;
      createTable(tableHeaders, filteredData);
    });
    paginationContainer.appendChild(firstPageLink);

    const ellipsisLeft = document.createElement('span');
    ellipsisLeft.textContent = ' ... ';
    // ellipsisLeft.style.color = 'gray';
    ellipsisLeft.className = 'pagination-ellipsis';
    ellipsisLeft.style.border = 'none';
    ellipsisLeft.style.cursor = 'default';
    ellipsisLeft.style.pointerEvents = 'none'; // Add this line to prevent clicking
    paginationContainer.appendChild(ellipsisLeft);

    for (let i = totalPages - 4; i <= totalPages;i++) {
      const paginationLink = document.createElement('a');
      paginationLink.href = '#';
      paginationLink.textContent = i;
      paginationLink.className = 'pagination-link';
      if (i === currentPage) {
        paginationLink.className += 'active';
      }

      paginationLink.addEventListener('click', (e) => {
        e.preventDefault();
        currentPage = i;
        createTable(tableHeaders, filteredData);
      });
      paginationContainer.appendChild(paginationLink);
    }
  } else {
    const firstPageLink = document.createElement('a');
    firstPageLink.href = '#';
    firstPageLink.textContent = 1;
    firstPageLink.className = 'pagination-link';
    firstPageLink.addEventListener('click', (e) => {
      e.preventDefault();
      currentPage = 1;
      createTable(tableHeaders, filteredData);
    });
    paginationContainer.appendChild(firstPageLink);

    const ellipsisLeft = document.createElement('span');
    ellipsisLeft.textContent = ' ... ';
    // ellipsisLeft.style.color = 'gray';
    ellipsisLeft.className = 'pagination-ellipsis';
    ellipsisLeft.style.border = 'none';
    ellipsisLeft.style.cursor = 'default';
    ellipsisLeft.style.pointerEvents = 'none'; // Add this line to prevent clicking
    paginationContainer.appendChild(ellipsisLeft);

    for (let i = currentPage - 2; i <= currentPage + 2; i++) {
      const paginationLink = document.createElement('a');
      paginationLink.href = '#';
      paginationLink.textContent = i;
      paginationLink.className = 'pagination-link';
      if (i === currentPage) {
        paginationLink.className += 'active';
      }

      paginationLink.addEventListener('click', (e) => {
        e.preventDefault();
        currentPage = i;
        createTable(tableHeaders, filteredData);
      });
      paginationContainer.appendChild(paginationLink);
    }

    const ellipsisRight = document.createElement('span');
    ellipsisRight.textContent = ' ... ';
    // ellipsisRight.style.color = 'gray';
    ellipsisRight.className = 'pagination-ellipsis';
    ellipsisRight.style.border = 'none';
    ellipsisRight.style.cursor = 'default';
    ellipsisRight.style.pointerEvents = 'none'; // Add this line to prevent clicking
    paginationContainer.appendChild(ellipsisRight);

    const lastPageLink = document.createElement('a');
    lastPageLink.href = '#';
    lastPageLink.textContent = totalPages;
    lastPageLink.className = 'pagination-link';
    lastPageLink.addEventListener('click', (e) => {
      e.preventDefault();
      currentPage = totalPages;
      createTable(tableHeaders, filteredData);
    });
    paginationContainer.appendChild(lastPageLink);
  }

  const nextPageButton = document.createElement('a');
  nextPageButton.href = '#';
  nextPageButton.innerHTML = '<i class="fa fa-angle-right" aria-hidden="true" ></i>';
  nextPageButton.className = 'pagination-link';
  nextPageButton.addEventListener('click', (e) => {
    e.preventDefault();
    if (currentPage < totalPages) {
      currentPage++;
      createTable(tableHeaders, filteredData);
    }
  });
  paginationContainer.appendChild(nextPageButton);

  const lastPageButton = document.createElement('a');
  lastPageButton.href = '#';
  lastPageButton.innerHTML = '<i class="fa fa-angle-double-right" aria-hidden="true"></i>';
  lastPageButton.className = 'pagination-link';
  lastPageButton.addEventListener('click', (e) => {
    e.preventDefault();
    currentPage = totalPages;
    createTable(tableHeaders, filteredData);
  });
  paginationContainer.appendChild(lastPageButton);

  if (currentPage === 1) {
    firstPageButton.style.display = 'none';
    previousPageButton.style.display = 'none';
  } else {
    firstPageButton.style.display = 'inline';
    previousPageButton.style.display = 'inline';
  }
  
  if (currentPage === totalPages) {
    lastPageButton.style.display = 'none';
    nextPageButton.style.display = 'none';
  } else {
    lastPageButton.style.display = 'inline';
    nextPageButton.style.display = 'inline';
  }

 // Style the pagination container
  paginationContainer.style.textAlign = 'right';
  paginationContainer.style.marginTop = '20px';

  const paginationLinks = paginationContainer.children;
  for (let i = 0; i < paginationLinks.length; i++) {
    if (paginationLinks[i].className !== 'pagination-ellipsis') {
      paginationLinks[i].classList.remove('active');
      if (paginationLinks[i].textContent === currentPage.toString()) {
        paginationLinks[i].classList.add('active');
      }
      paginationLinks[i].classList.add('pagination-link');
    }
  }

}

function getDetectLine(level, tildePresent,row) {
  let matches = level.match(codeRegex);
  if (!matches) {
    matches = level.match(codeRegex2);
  }
  
  if (matches) {
    let result = '';
    let lastIndex = 0;
    for (let match of matches) {
      let matchIndex = level.indexOf(match, lastIndex); // start searching from the last index
      result += level.substring(lastIndex, matchIndex); // get the substring from the last index to the current match
      
      let replaced = false;
      let faultNo = match;
      if (match.startsWith('~')) {
        faultNo = match.replace(/^~/, ''); // Remove the tilde from the faultNo if it exists
        replaced = true;
      }
      
      if (hiddenData.find(row => row['Fault No.'] === faultNo)) {
        const textDecoration = 'underline';
        const linkText = (tildePresent && !replaced) ? '~' + faultNo : faultNo;

        result += `<a style="text-decoration: ${textDecoration}; cursor: pointer;" onclick="showPopup('${faultNo}', ${tildePresent},'${row}')">${linkText}</a>`;
      } else {
        result += (tildePresent && !replaced) ? '~' + match : match;
      }
      
      lastIndex = matchIndex + match.length; // update the last index to the end of the current match
    }
    result += level.substring(lastIndex); // add the remaining substring
    return result;
  } else {
    return level;
  }
}

function getReferenceText(text,row) {
  function replaceMatch(match, tilde) {
    const faultNo = match.replace(/^~/, ''); // Remove the tilde from the faultNo if it exists
    if (hiddenData.find(row => row['Fault No.'] === faultNo)) {
      const textDecoration = 'underline';

      return `<a style="text-decoration: ${textDecoration}; cursor: pointer;" onclick="${`showPopup('${faultNo}', ${tilde ? true : false},'${row}')`}"">${tilde ? '~' + faultNo : faultNo}</a>`;
         
    } else {
      return match;
    }
  }

  return text.replace(codeRegex, replaceMatch).replace(codeRegex2, replaceMatch);
}


function findMatchedPrefix(faultNo) {
  const prefix = Object.keys(faultNoPrefixes).find((prefix) => faultNo.startsWith(prefix));
  return prefix;
}


function showPopup(faultNo,tilde,row) {
  const referenceRow = hiddenData.find((row) => row['Fault No.'] === faultNo);
  if (!referenceRow) {
    console.error(`No row found with Fault No. ${faultNo}`);
    return;
  }

  const popup = document.createElement('div');
  popup.className = 'original-popup';

  
  if (popupArray.length === 0) {
    // If all popups have been closed, reset the popup location
    popup.style.top = `${window.scrollY}px`;
    popup.style.left = `0px`; // add 20 to left
  } else {
    // Otherwise, position the popup below the previous one
    popup.style.top = `${window.scrollY + popupCount * 20}px`;
    popup.style.left = `0px`;
  }

  // Add "Circuit Diagram" link at the top left
  const prefix = findMatchedPrefix(row);
  if (circuitDiagrams[prefix]) {
    const circuitDiagramLink = document.createElement('a');
    circuitDiagramLink.href = `${circuitDiagrams[prefix]}`;
    circuitDiagramLink.target = '_blank';
    circuitDiagramLink.style.fontSize = '14px';
    circuitDiagramLink.textContent = 'Circuit Diagrams';
    circuitDiagramLink.classList.add('circuit-diagram-link');
    popup.insertBefore(circuitDiagramLink, popup.firstChild);
  }

  popup.style.zIndex = popupCount+1000;

  popup.style.cursor = 'move'; // Add a move cursor to indicate draggability

  let isDragging = false;
  let offsetX = 0;
  let offsetY = 0;
  popupArray.push(popup);
  

  // Add event listeners for dragging
  popup.addEventListener('mousedown', (e) => {
    isDragging = true;
    offsetX = e.clientX - popup.offsetLeft;
    offsetY = e.clientY - popup.offsetTop;
    // Bring the popup to the front when dragging starts
    popupArray.forEach((p) => {
      p.style.zIndex = popupCount;
    });
    popup.style.zIndex = popupCount + 1000;
  });

  document.addEventListener('mousemove', (e) => {
    if (isDragging) {
      popup.style.top = `${e.clientY - offsetY}px`;
      popup.style.left = `${e.clientX - offsetX}px`;
    }
  });

  document.addEventListener('mouseup', () => {
    isDragging = false;
  });

  // Increment the popup count
  popupCount++;

  const popupContent = document.createElement('div');
  popupContent.className = 'original-popup-content';
  popupContent.innerHTML = `
  <div>
    <h2>${tilde ? '~' + faultNo : faultNo}</h2>
    <table>
      <tr><th>No.</th><td>${tilde ? '~' + referenceRow['Fault No.'] : referenceRow['Fault No.']}</td></tr>
      <tr><th>Monitoring</th><td>${tilde ? '~' + referenceRow['Fault Name'] : referenceRow['Fault Name']}</td></tr>
      ${referenceRow['D2'] ? `<tr><th>I/F Type</th><td>${referenceRow['D2']}</td></tr>` : ''}
      ${getReferenceText(referenceRow['D1'],row) || getReferenceText(referenceRow['Car Type'],row) || getReferenceText(referenceRow['Level'],row) ?
        (tilde ?
          (getReferenceText(referenceRow['Car Type'],row) ?
            `<tr><th>Detect</th><td><b>${getReferenceText(referenceRow['Car Type'],row)}</b><br>${getReferenceText(referenceRow['Level'],row)}</td></tr>` :
            `<tr><th>Detect</th><td><b>${getDetectLine(referenceRow['Level'],tilde,row)}</b></td></tr>`
          ) :
          (getReferenceText(referenceRow['Car Type'],row) ?
            `<tr><th>Detect</th><td><b>${getReferenceText(referenceRow['Level'],row)}</b><br>${getReferenceText(referenceRow['Car Type'],row)}<br>${getReferenceText(referenceRow['D1'],row)}</td></tr>` :
            `<tr><th>Detect</th><td><b>${getReferenceText(referenceRow['Level'],tilde,row)}</b></td></tr>`
          )
        ) :
        ''
      }
      <!-- Add more columns as needed -->
    </table>
  </div>
`;

  popup.appendChild(popupContent);

  // Create a close button
  const closeButton = document.createElement('button');
  closeButton.textContent = '̽';
  closeButton.className = 'close-button';

  // Add an event listener to the close button to remove the popup from the array
  closeButton.addEventListener('click', () => {
    const index = popupArray.indexOf(popup);
    if (index !== -1) {
      popupArray.splice(index, 1);
      if (popupArray.length === 0) {
        // If all popups have been closed, reset the popup count
        popupCount = 0;
      }
    }
    popup.remove();
  });

  // Append the close button to the popup
  popup.appendChild(closeButton);

  document.body.appendChild(popup);
}

// Add a search input field
const searchInput = document.getElementById('search-input');

// Add an event listener to the search input field
searchInput.addEventListener('input', searchTable);

function searchTable(event) {
  const searchTerm = event.target.value.replace(/[-\s]/g, '').toLowerCase(); // Remove - and spaces from search term and convert to lowercase

  showSpinner(); // Show the spinner before starting the search operation

  setTimeout(() => {
    let searchData = (selectedFilter === 'All') ? globalData : globalData.filter((row) => row['Fault No.'].startsWith(selectedFilter + '-'));

    if (searchTerm !== '') {
      searchData = searchData.filter((row) => {
        for (let key in row) {
          const value = row[key].toString().replace(/[-\s]/g, '').toLowerCase();
          if (value.includes(searchTerm)) {
            return true;
          }
        }
        return false;
      });
    }

    filteredData = searchData;

    // Update the currentPage and totalPages based on the search results
    totalPages = Math.ceil(filteredData.length / rowsPerPage);
    currentPage = 1;

    // Create a new table with the search results
    createTable(tableHeaders, filteredData);

    hideSpinner(); // Hide the spinner after the table has been updated
  }, 20); // Adjust the timeout duration as needed
}

function showNote() {
  // Create a new popup element
  const notePopup = document.createElement('div');
  notePopup.className = 'note-popup';

  // Create a close button
  const closeButton = document.createElement('button');
  closeButton.textContent = '̽';
  closeButton.className = 'close-button';
  closeButton.addEventListener('click', () => {
    notePopup.remove();
  });

  // Create a tabbed interface for the note
  const tabs = document.createElement('div');
  tabs.className = 'tabs';

  const tabButtons = [];
  const tabContents = [];

  // Create tabs for each section
  const sections = [
    { title: 'Logical Operators', content: `
      <ul>
        <li><strong>U</strong>: OR</li>
        <li><strong>~</strong>: Negation</li>
        <li><strong>^</strong>: Exclusive OR</li>
        <li><strong>&</strong>: AND</li>
        <li><strong>< , > , == , >= , <= , !=</strong>: Comparison</li>
        <li><strong>#</strong>: Direct value</li>
      </ul>
    ` },
    { title: 'Detect and Clear', content: `
      <ul>
        <li><strong>D</strong>: Detect Conditions</li>
        <li><strong>C</strong>: Clear Conditions</li>
        <li><strong>TD</strong>: Time Delay</li>
      </ul>
    ` },
    { title: 'Car Types', content: `
      <ul>
        <li><strong>Tc1</strong>: Central Unit 1</li>
        <li><strong>Tc2</strong>: Central Unit 2</li>
        <li><strong>Mp</strong>: Mp1, Mp2 car</li>
        <li><strong>MW</strong>: MW1, MW2 car</li>
        <li><strong>HMp</strong>: HMp car</li>
        <li><strong>HT</strong>: HT car</li>
      </ul>
    ` },
    { title: 'Fault Codes', content: `
      <ul>
        <li><strong>TMS</strong>: TMS (Fault made by application)</li>
        <li><strong>CAB</strong>: CAB</li>
        <li><strong>VOBC</strong>: VOBC, ATP</li>
        <li><strong>BRAKE</strong>: Brake system, Air compressor</li>
        <li><strong>APS</strong>: Auxiliary Power Supply System</li>
        <li><strong>CI</strong>: Converter inverter</li>
        <li><strong>DCU U</strong>: Door system up side</li>
        <li><strong>DCU D</strong>: Door system down side</li>
        <li><strong>VAC1</strong>: Ventilation and Air Conditioning Unit1</li>
        <li><strong>VAC2</strong>: Ventilation and Air Conditioning Unit2</li>
        <li><strong>MC</strong>: Media Controller</li>
        <li><strong>RADIO</strong>: Train Radio</li>
        <li><strong>ETC</strong>: Automatic Power Control system, Vehicle Control Circuit</li>
        <li><strong>HADS</strong>: Hot Axlebox Detection System</li>
        <li><strong>ORIS</strong>: Onboard Railway Inspection System</li>
        <li><strong>SMD</strong>: Smoke Detection</li>
        <li><strong>DVAU</strong>: Digital Voice Announcement Unit</li>
        <li><strong>VBC</strong>: Video Broadcast Controller</li>
        <li><strong>TNI</strong>: Train Number Indicator</li>
        <li><strong>DI</strong>: Destination Indicator</li>
      </ul>
    ` },
    { title: 'Start Tour'},
  ];

  sections.forEach((section, index) => {
    const tabButton = document.createElement('button');
    tabButton.className = 'tab-button';
    tabButton.textContent = section.title;
    tabButton.addEventListener('click', () => {
      if (section.title === 'Start Tour') {
        notePopup.remove();
        tourStart();
      } else {
        tabButtons.forEach((tab) => tab.classList.remove('active'));
        tabButton.classList.add('active');
        tabContents.forEach((content) => content.style.display = 'none');
        tabContents[index].style.display = 'block';
      }
    });
    tabButtons.push(tabButton);
    tabs.appendChild(tabButton);
  
    const tabContent = document.createElement('div');
    tabContent.className = 'tab-content';
    tabContent.innerHTML = section.content;
    tabContent.style.display = index === 0? 'block' : 'none';
    tabContents.push(tabContent);
    notePopup.appendChild(tabContent);
  
    if (index === 0) {
      tabButton.classList.add('active');
    }
  });

  // Append the tabs and close button to the popup
  notePopup.appendChild(tabs);
  notePopup.appendChild(closeButton);

  // Append the popup to the body of the document
  document.body.appendChild(notePopup);
  // Make the popup draggable
  let isDragging = false;
  let startX, startY, initialX, initialY;
  notePopup.style.cursor = 'move';

  notePopup.addEventListener('mousedown', (e) => {
    isDragging = true;
    startX = e.clientX;
    startY = e.clientY;
    initialX = notePopup.offsetLeft;
    initialY = notePopup.offsetTop;
  });

  document.addEventListener('mousemove', (e) => {
    if (isDragging) {
      notePopup.style.top = `${initialY + e.clientY - startY}px`;
      notePopup.style.left = `${initialX + e.clientX - startX}px`;
    }
  });

  document.addEventListener('mouseup', () => {
    isDragging = false;
  });
}

const noteLink = document.getElementById('note-link');
noteLink.addEventListener('click', showNote);

function reloadPage() {
  window.location.reload(); // Reload the current page
}

// Add an event listener to the Go to Top button
document.addEventListener('DOMContentLoaded', function() {
  const goToTopButton = document.querySelector('.js-gotop');

  goToTopButton.addEventListener('click', function(event) {
    event.preventDefault();

    // Animate the scroll to the top of the page
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });

  // Show/hide the Go to Top button based on scroll position
  window.addEventListener('scroll', function() {
    const scrollTop = window.scrollY;
    if (scrollTop > 200) {
      goToTopButton.style.display = 'block';
    } else {
      goToTopButton.style.display = 'none';
    }
  });
});


function getLevelHtml(level, tilde) {
  let matches = level.match(codeRegex);
  if (!matches) {
    matches = level.match(codeRegex2);
  }
  if (matches) {
    let result = '';
    let lastIndex = 0;
    for (let match of matches) {
      let matchIndex = level.indexOf(match, lastIndex); // start searching from the last index
      result += level.substring(lastIndex, matchIndex); // get the substring from the last index to the current match
      result += tilde ? (match.startsWith('~') ? match.replace(/^~/, '') : '~' + match) : match;
      lastIndex = matchIndex + match.length; // update the last index to the end of the current match
    }
    result += level.substring(lastIndex); // add the remaining substring
    return result;
  } else {
    return level;
  }
}

function showSitemapPopup(faultNo,tilde,row) {
  const popupContent = document.createElement('div');
  popupContent.className = 'Sitemap-popup-content';

  const SitemapContainer = document.createElement('div');
  SitemapContainer.className = 'Sitemap-container';

  const SitemapRoot = document.createElement('ul');
  SitemapRoot.className = 'Sitemap-root';

  const rootNode = createSitemapNode(faultNo,tilde);
  if (rootNode) {
    SitemapRoot.appendChild(rootNode);
  }

  SitemapContainer.appendChild(SitemapRoot);
  popupContent.appendChild(SitemapContainer);

  const popup = document.createElement('div');
  popup.className = 'Sitemap-popup';
  popup.style.position = 'absolute';
  if (popupArray.length === 0) {
    // If all popups have been closed, reset the popup location
    popup.style.top = `${window.scrollY}px`;
    popup.style.left = `0px`; // add 20 to left
  } else {
    // Otherwise, position the popup below the previous one
    popup.style.top = `${window.scrollY + popupCount * 20}px`;
    popup.style.left = `0px`;
  }
  popup.style.zIndex = popupCount+1000;


  // Add "Circuit Diagram" link at the top left
  const prefix = findMatchedPrefix(row);
  if (circuitDiagrams[prefix]) {
    const circuitDiagramLink = document.createElement('a');
    circuitDiagramLink.href = `${circuitDiagrams[prefix]}`;
    circuitDiagramLink.target = '_blank';
    circuitDiagramLink.style.fontSize = '14px';
    circuitDiagramLink.textContent = 'Circuit Diagrams';
    circuitDiagramLink.classList.add('circuit-diagram-link');
    popupContent.insertBefore(circuitDiagramLink, popupContent.firstChild);
  }
  
  popup.appendChild(popupContent);

  // Make the popup draggable
  let isDragging = false;
  let startX, startY, initialX, initialY;
  popupArray.push(popup);
  popup.style.cursor = 'move';

  popup.addEventListener('mousedown', (e) => {
    isDragging = true;
    startX = e.clientX;
    startY = e.clientY;
    initialX = popup.offsetLeft;
    initialY = popup.offsetTop;
    popupArray.forEach((p) => {
      p.style.zIndex = popupCount;
    });
    popup.style.zIndex = popupCount + 1000;
  });

  document.addEventListener('mousemove', (e) => {
    if (isDragging) {
      popup.style.top = `${initialY + e.clientY - startY}px`;
      popup.style.left = `${initialX + e.clientX - startX}px`;
    }
  });

  document.addEventListener('mouseup', () => {
    isDragging = false;
  });


  popupCount++;

  document.body.appendChild(popup);

  // Close popup on click outside or on a close button
  const closeButton = document.createElement('button');
  closeButton.textContent = '̽';
  closeButton.className = 'close-button';
  closeButton.addEventListener('click', () => document.body.removeChild(popup));
  popupContent.appendChild(closeButton);

  window.addEventListener('click', (event) => {
    if (event.target === popup) {
      document.body.removeChild(popup);
    }
  });

  // Add an event listener to the close button to remove the popup from the array
  closeButton.addEventListener('click', () => {
    const index = popupArray.indexOf(popup);
    if (index !== -1) {
      popupArray.splice(index, 1);
      if (popupArray.length === 0) {
        // If all popups have been closed, reset the popup count
        popupCount = 0;
      }
    }
    popup.remove();
  });
}

function createSitemapNode(faultNo, tilde) {
  const faultRow = hiddenData.find(row => row['Fault No.'] === faultNo);

  if (!faultRow) {
    return null;
  }

  const SitemapNode = document.createElement('li');
  SitemapNode.className = 'Sitemap-node';

  const nodeContent = document.createElement('div');
  nodeContent.className = 'Sitemap-node-content';
  nodeContent.innerHTML = `
    <table class = "Sitemap">
      <tr><th>No</th><td>${tilde ? '~' + faultRow['Fault No.'] : faultRow['Fault No.']}</td></tr>
      <tr><th>Monitoring</th><td>${tilde ? '~' + faultRow['Fault Name'] : faultRow['Fault Name']}</td></tr>
      ${faultRow['D2'] ? `<tr><th>I/F Type</th><td>${faultRow['D2']}</td></tr>` : ''}
      ${faultRow['D1'] || faultRow['Car Type'] || faultRow['Level'] ?
        (tilde ?
          faultRow['Car Type'] ?
            `<tr><th>Detect</th><td><b>${faultRow['Car Type']}</b><br>${faultRow['Level']}</td></tr>` :
            `<tr><th>Detect</th><td><b>${getLevelHtml(faultRow['Level'], tilde)}</b></td></tr>`:
          faultRow['Car Type'] ?
            `<tr><th>Detect</th><td><b>${faultRow['Level']}</b><br>${faultRow['Car Type']}<br>${faultRow['D1']}</td></tr>` :
            `<tr><th>Detect</th><td><b>${getLevelHtml(faultRow['Level'], tilde)}</b></td></tr>`
        ) :
        ''
      }
    </table>
  `;

  const childNodes = document.createElement('ul');
  childNodes.className = 'Sitemap-child-nodes';

  const addedFaultNos = new Set();

  // Check if the Level field exists before processing it
  if (getLevelHtml(faultRow['Level'], tilde)) {
    let matches = getLevelHtml(faultRow['Level'], tilde).match(codeRegex);
    if (!matches) {
      matches = getLevelHtml(faultRow['Level'], tilde).match(codeRegex2);
    }
    if (matches) {
      for (let match of matches) {
        const tildeInText = match.startsWith('~') ? '~' : '';
        const refFaultNo = match.replace(/^~/, ''); // Remove the tilde from the faultNo if it exists
        if (!addedFaultNos.has(refFaultNo)) {
          addedFaultNos.add(refFaultNo);
          const refFaultRow = hiddenData.find(row => row['Fault No.'] === refFaultNo);
          if (refFaultRow) {
            const childNode = createSitemapNode(refFaultNo, tildeInText);
            if (childNode) {
              childNodes.appendChild(childNode);
            }
          }
        }
      }
    }
  }

  SitemapNode.appendChild(nodeContent);
  if (childNodes.children.length > 0) {
    SitemapNode.appendChild(childNodes);
    nodeContent.classList.add('has-children'); // Add a class to indicate that the node has children
    nodeContent.addEventListener('click', () => {
      childNodes.classList.toggle('hidden');
      nodeContent.classList.toggle('collapsed');
    });
  
  } else {
    nodeContent.addEventListener('click', () => {
      // You can add any action you want when a node without children is clicked
    });
  }

    // Add hover event listeners to apply class to children
    nodeContent.addEventListener('mouseenter', () => {
      SitemapNode.classList.add('hover');
    });
  
    nodeContent.addEventListener('mouseleave', () => {
      SitemapNode.classList.remove('hover');
    });


  
  return SitemapNode;
}


function showTreePopup(faultNo,tilde,row) {
  // console.log(row);
  const popupContent = document.createElement('div');
  popupContent.className = 'popup-content';

  const treeContainer = document.createElement('div');
  treeContainer.className = 'tree-container';

  const treeRoot = document.createElement('ul');
  treeRoot.className = 'tree-root';

  const rootNode = createTreeNode(faultNo,tilde);
  if (rootNode) {
    treeRoot.appendChild(rootNode);
  }

  treeContainer.appendChild(treeRoot);
  popupContent.appendChild(treeContainer);

  const popup = document.createElement('div');
  popup.className = 'popup';
  popup.style.position = 'absolute';


  if (popupArray.length === 0) {
    // If all popups have been closed, reset the popup location
    popup.style.top = `${window.scrollY}px`;
    popup.style.left = `0px`; // add 20 to left
  } else {
    // Otherwise, position the popup below the previous one
    popup.style.top = `${window.scrollY + popupCount * 20}px`;
    popup.style.left = `0px`;
  }
  popup.style.zIndex = popupCount+1000;



  // Add "Circuit Diagram" link at the top left
  const prefix = findMatchedPrefix(row);
  if (circuitDiagrams[prefix]) {
    const circuitDiagramLink = document.createElement('a');
    circuitDiagramLink.href = `${circuitDiagrams[prefix]}`;
    circuitDiagramLink.target = '_blank';
    circuitDiagramLink.style.fontSize = '14px';
    circuitDiagramLink.textContent = 'Circuit Diagrams';
    circuitDiagramLink.classList.add('circuit-diagram-link');
    popupContent.insertBefore(circuitDiagramLink, popupContent.firstChild);
  }
  popup.appendChild(popupContent);

  // Make the popup draggable
  let isDragging = false;
  let startX, startY, initialX, initialY;
  popupArray.push(popup);
  popup.style.cursor = 'move';

  popup.addEventListener('mousedown', (e) => {
    isDragging = true;
    startX = e.clientX;
    startY = e.clientY;
    initialX = popup.offsetLeft;
    initialY = popup.offsetTop;
    popupArray.forEach((p) => {
      p.style.zIndex = popupCount;
    });
    popup.style.zIndex = popupCount + 1000;
  });

  document.addEventListener('mousemove', (e) => {
    if (isDragging) {
      popup.style.top = `${initialY + e.clientY - startY}px`;
      popup.style.left = `${initialX + e.clientX - startX}px`;
    }
  });

  document.addEventListener('mouseup', () => {
    isDragging = false;
  });


  popupCount++;

  document.body.appendChild(popup);

  // Close popup on click outside or on a close button
  const closeButton = document.createElement('button');
  closeButton.textContent = '̽';
  closeButton.className = 'close-button';
  closeButton.addEventListener('click', () => document.body.removeChild(popup));
  popupContent.appendChild(closeButton);

  window.addEventListener('click', (event) => {
    if (event.target === popup) {
      document.body.removeChild(popup);
    }
  });

  // Add an event listener to the close button to remove the popup from the array
  closeButton.addEventListener('click', () => {
    const index = popupArray.indexOf(popup);
    if (index !== -1) {
      popupArray.splice(index, 1);
      if (popupArray.length === 0) {
        // If all popups have been closed, reset the popup count
        popupCount = 0;
      }
    }
    popup.remove();
  });
}

function createTreeNode(faultNo, tilde) {
  const faultRow = hiddenData.find(row => row['Fault No.'] === faultNo);

  if (!faultRow) {
    return null;
  }

  
  const codeRegex = /([~])?[A-Z]{2}[A-Z0-9]?\s?\d{3}(?= |$|&|,|>=|#| |>|=|<|<=|-|==|)/g;
  const codeRegex2 = /([~])?[A-Z]+-[A-Z0-9]?\s?\d{3}(?= |$|&|,|>=|#| |>|=|<|<=|-|==|)/g;

  const treeNode = document.createElement('li');
  treeNode.className = 'tree-node';

  const nodeContent = document.createElement('div');
  nodeContent.className = 'node-content';
  nodeContent.innerHTML = `
    <table style="table-layout: fixed;">
      <tr><th style="width: 100px;">No</th><td>${tilde ? '~' + faultRow['Fault No.'] : faultRow['Fault No.']}</td></tr>
      <tr><th style="width: 100px;">Monitoring</th><td>${tilde ? '~' + faultRow['Fault Name'] : faultRow['Fault Name']}</td></tr>
      ${faultRow['D2'] ? `<tr><th style="width: 100px;">I/F Type</th><td>${faultRow['D2']}</td></tr>` : ''}
      ${faultRow['D1'] || faultRow['Car Type'] || faultRow['Level'] ?
        (tilde ?
          faultRow['Car Type'] ?
            `<tr><th style="width: 100px;">Detect</th><td><b>${faultRow['Car Type']}</b><br>${faultRow['Level']}</td></tr>` :
            `<tr><th style="width: 100px;">Detect</th><td><b>${getLevelHtml(faultRow['Level'], tilde)}</b></td></tr>`:
          faultRow['Car Type'] ?
            `<tr><th style="width: 100px;">Detect</th><td><b>${faultRow['Level']}</b><br>${faultRow['Car Type']}<br>${faultRow['D1']}</td></tr>` :
            `<tr><th style="width: 100px;">Detect</th><td><b>${getLevelHtml(faultRow['Level'], tilde)}</b></td></tr>`
        ) :
        ''
      }
    </table>
  `;


  function getLevelHtml(level, tilde) {
    let matches = level.match(codeRegex);
    if (!matches) {
      matches = level.match(codeRegex2);
    }
    if (matches) {
      let result = '';
      let lastIndex = 0;
      for (let match of matches) {
        let matchIndex = level.indexOf(match, lastIndex); // start searching from the last index
        result += level.substring(lastIndex, matchIndex); // get the substring from the last index to the current match
        result += tilde ? (match.startsWith('~') ? match.replace(/^~/, '') : '~' + match) : match;
        lastIndex = matchIndex + match.length; // update the last index to the end of the current match
      }
      result += level.substring(lastIndex); // add the remaining substring
      return result;
    } else {
      return level;
    }
  }

  const childNodes = document.createElement('ul');
  childNodes.className = 'child-nodes';

  const addedFaultNos = new Set();

  // Check if the Level field exists before processing it
  if (getLevelHtml(faultRow['Level'], tilde)) {
    let matches = getLevelHtml(faultRow['Level'], tilde).match(codeRegex);
    if (!matches) {
      matches = getLevelHtml(faultRow['Level'], tilde).match(codeRegex2);
    }
    if (matches) {
      for (let match of matches) {
        const tildeInText = match.startsWith('~') ? '~' : '';
        const refFaultNo = match.replace(/^~/, ''); // Remove the tilde from the faultNo if it exists
        if (!addedFaultNos.has(refFaultNo)) {
          addedFaultNos.add(refFaultNo);
          const refFaultRow = hiddenData.find(row => row['Fault No.'] === refFaultNo);
          if (refFaultRow) {
            const childNode = createTreeNode(refFaultNo, tildeInText);
            if (childNode) {
              childNodes.appendChild(childNode);
            }
          }
        }
      }
    }
  }

  treeNode.appendChild(nodeContent);
  if (childNodes.children.length > 0) {
    treeNode.appendChild(childNodes);
    nodeContent.classList.add('has-children'); // Add a class to indicate that the node has children
    nodeContent.addEventListener('click', () => {
      childNodes.classList.toggle('hidden');
      nodeContent.classList.toggle('collapsed');
    });
  
  } else {
    nodeContent.addEventListener('click', () => {
      // You can add any action you want when a node without children is clicked
    });
  }

    // Add hover event listeners to apply class to children
    nodeContent.addEventListener('mouseenter', () => {
      treeNode.classList.add('hover');
    });
  
    nodeContent.addEventListener('mouseleave', () => {
      treeNode.classList.remove('hover');
    });


  
  return treeNode;
}

function showSpinner() {
  document.getElementById('loading-spinner').style.display = 'block';
}

function hideSpinner() {
  document.getElementById('loading-spinner').style.display = 'none';
}


const tour = new tourguide.TourGuideClient({
  hidePrev: false,
  steps: [
    {
      title: "<span style='font-size: 24px'>Welcome</span>",
      content: `
        <span style="font-size: 18px">Start exploring the Fault Diagnostic Dashboard!</span>
        <div style="text-align: left; ">
          <p style="font-size: 14px; color: #aaa">Use the arrow keys or click next to proceed.</p>
        </div>
      `,
      target: null,
      placement: "bottom",
      beforeEnter: (currentStep, nextStep) => {
        tour.setOptions({ hidePrev: true });
      },
      beforeLeave: (currentStep, nextStep) => {
        tour.setOptions({ hidePrev: false });
      }
    },
    {
      title: "<span style='font-size: 24px'>Customize View</span>",
      content: `
        <span style="font-size: 18px">Choose a popup style that suits you.</span>
        <div style="text-align: left; ">
          <p style="font-size: 14px; color: #aaa">Use the arrow keys or click next to proceed.</p>
        </div>
      `,
      target: ".switch-container",
      placement: "bottom"
    },
    {
      title: "<span style='font-size: 24px'>Fault Definitions and Help</span>",
      content: `
        <span style="font-size: 18px">Get a better understanding of the fault definitions. You can also restart the tour here.</span>
        <div style="text-align: left; ">
          <p style="font-size: 14px; color: #aaa">Use the arrow keys or click next to proceed.</p>
        </div>
      `,
      target: "#note-link",
      placement: "bottom"
    },
    {
      title: "<span style='font-size: 24px'>Search Faults</span>",
      content: `
        <span style="font-size: 18px">Enter a search term to find faults quickly.</span>
        <div style="text-align: left; ">
          <p style="font-size: 14px; color: #aaa">Use the arrow keys or click next to proceed.</p>
        </div>
      `,
      target: "#search-input",
      placement: "bottom",
      beforeEnter: (currentStep, nextStep) => {
        inputSearch("brake"); // Call the inputSearch function with "brake" as an argument
      }
    },
    {
      title: "<span style='font-size: 24px'>Filter Faults</span>",
      content: `
        <span style="font-size: 18px">Select a fault type to narrow down the list.</span>
        <div style="text-align: left; ">
          <p style="font-size: 14px; color: #aaa">Use the arrow keys or click next to proceed.</p>
        </div>
      `,
      target: "#filter-container",
      placement: "bottom"
    },
    {
      title: "<span style='font-size: 24px'>Fault Details</span>",
      content: `
        <span style="font-size: 18px">View the fault number, name, criticality level, detection logic and more.</span>
        <div style="text-align: left; ">
          <p style="font-size: 14px; color: #aaa">Use the arrow keys or click next to proceed.</p>
        </div>
      `,
      target: null,
      placement: "bottom",
      beforeEnter: (currentStep, nextStep) => {
        const row = document.querySelector("#table-body tr:nth-child(2)");
        if (row) {
          nextStep.target = row;
        } else {
          console.warn("Row not found!");
          tour.nextStep(); // Skip this step if the row is not found
        }
      },
      beforeLeave: (currentStep, nextStep) => {
        // Set the target back to original if moving backwards
        if (tour.activeStep < nextStep.order) {
          currentStep.target = "#filter-container";
        }
      }
    },
    {
      title: "<span style='font-size: 24px'>Fault Logic</span>",
      content: `
        <span style="font-size: 18px">Click to read the fault logic and details.</span>
        <div style="text-align: left; ">
          <p style="font-size: 14px; color: #aaa">Use the arrow keys or click next to proceed.</p>
        </div>
      `,
      target: null,
      placement: "bottom",
      beforeEnter: (currentStep, nextStep) => {
        const cell = document.querySelector("#table-body tr:nth-child(2) td:nth-child(5)");
        if (cell) {
          nextStep.target = cell;
        } else {
          console.warn("Cell not found!");
          tour.nextStep();// Skip this step if the cell is not found
        }
      },
      beforeLeave: (currentStep, nextStep) => {
        // Set the target back to original if moving backwards
        if (tour.activeStep < nextStep.order) {
          currentStep.target = "#table-body tr:nth-child(2)";
        }
      }
    },
    {
      title: "<span style='font-size: 24px'>Navigate Pages</span>",
      content: `
        <span style="font-size: 18px">Use these buttons to navigate the table.</span>
        <div style="text-align: left; ">
          <p style="font-size: 14px; color: #aaa">Use the arrow keys or click next to proceed.</p>
        </div>
      `,
      target: "#pagination-container",
      placement: "bottom"
    },
    {
      title: "<span style='font-size: 24px'>Select a Theme</span>",
      content: `
        <span style="font-size: 18px">Change your theme by clicking the icon.</span>
        <div style="text-align: left; ">
          <p style="font-size: 14px; color: #aaa">Use the arrow keys or click next to proceed.</p>
        </div>
      `,
      target: ".dark-mode-toggle",
      placement: "bottom"
    }
  ]
});

tour.setOptions({
  debug: false, // Disable debug logs, including "Tour started" and "Tour exited"
  targetPadding: number = 15,
  progressBar: '#777',
  completeOnFinish: true,
});

if (!tour.isFinished()){ 
  tourStart();
}

function tourStart(){
  clearSearch();
  closeAllPopups();
  goToFilter('All');
  if (rowsPerPage != 10) setRowsPerPage(10);
  tour.start();
}

tour.onBeforeExit(()=>{
  clearSearch();
  tour.finishTour(true).catch(() => {}); // ignore any errors
});


function goToFilter(filterName) {
  const filterButton = Array.from(document.querySelectorAll('.filter-button')).find(button => button.textContent.trim() === filterName);
  if (filterButton) {
    filterButton.click();
  }
}

function closeAllPopups() {
  for (const popup of popupArray) {
    document.body.removeChild(popup);
  }
  popupArray = [];
  popupCount = 0;
}

function clearSearch() {
  const searchInput = document.querySelector("input[type='search']");
  if(searchInput.value != ""){
    searchInput.value = "";
    searchInput.dispatchEvent(new Event('input', { bubbles: true }));
  }
}

function inputSearch(text) {
  const searchInput = document.querySelector("input[type='search']");
  searchInput.value = text;
  searchInput.dispatchEvent(new Event('input', { bubbles: true }));
}

function setRowsPerPage(value) {
  rowsPerPage = parseInt(value);
  const filteredDataTemp = filteredData.filter(row => !row['hidden']); // Filtered data based on current filter
  const totalPagesNew = Math.ceil(filteredDataTemp.length / rowsPerPage);
  currentPage = Math.min(currentPage, totalPagesNew); // Ensure currentPage doesn't exceed totalPagesNew
  setTimeout(() => {
    createTable(tableHeaders, filteredData);
  }, 20);
}

// Function to toggle the theme
function toggleDarkMode() {
  darkMode = darkMode === 'enabled' ? 'disabled' : 'enabled';
  localStorage.setItem('darkMode', darkMode);
  document.body.classList.toggle('dark-mode', darkMode === 'enabled');
  const sunIcon = document.querySelector('.bi-sun');
  const moonIcon = document.querySelector('.fa-moon');
  sunIcon.style.display = darkMode === 'enabled' ? 'none' : 'block';
  moonIcon.style.display = darkMode === 'enabled' ? 'block' : 'none';
}
// On page load, set the theme
document.addEventListener('DOMContentLoaded', () => {
  document.body.classList.toggle('dark-mode', darkMode === 'enabled');
  const sunIcon = document.querySelector('.bi-sun');
  const moonIcon = document.querySelector('.fa-moon');
  sunIcon.style.display = darkMode === 'enabled' ? 'none' : 'block';
  moonIcon.style.display = darkMode === 'enabled' ? 'block' : 'none';
});
