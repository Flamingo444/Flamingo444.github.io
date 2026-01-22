/* Data */
const ctfData = [
    { name: "KnightCTF 2026", team: "0xFun", rank: "1/891", year: "2026" },
    { name: "Scarlet CTF 2026", team: "OxFun", rank: "8/762", year: "2026" },
    { name: "UoFCTF 2026", team: "OxFun", rank: "22/1551", year: "2026" },
    { name: "hxp 39C3 CTF 2025", team: "OxFun", rank: "12/1337", year: "2025" },
    { name: "TSG CTF 2025", team: "OxFun", rank: "44/489", year: "2025" },
    { name: "MetaCTF Dec2025 Individual", team: "Solo (Project 121)", rank: "7/1145", year: "2025" },
    { name: "BSides Algiers 2025 CTF", team: "OxFun", rank: "1/334", year: "2025" },
    { name: "NahamCTF 2025", team: "OxFun", rank: "3/851", year: "2025" },
    { name: "SECCON 2025 Quals", team: "THEM?!", rank: "58/902", year: "2025" },
    { name: "NiteCTF 2025", team: "THEM?!", rank: "3/1224", year: "2025" },
    { name: "NexHunt CTF 2025", team: "THEM?!", rank: "4/971", year: "2025" },
    { name: "Backdoor CTF 2025", team: "THEM?!", rank: "65/602", year: "2025" },
    { name: "WannaGame Championship 2025", team: "THEM?!", rank: "10/672", year: "2025" },
    { name: "NullCTF 2025", team: "THEM?!", rank: "8/609", year: "2025" },
    { name: "Patriot CTF 2025", team: "Solo (Project 121)", rank: "6/1343", year: "2025" },
    { name: "GSU CTF Hackathon 2024", team: "Team Cabybara", rank: "3rd", year: "2024" },
    { name: "NahamCTF 2024", team: "KSU Offensive Security Research Club", rank: "216/2653", year: "2024" },
    { name: "CCDC 2024", team: "KSU Offensive Security Research Club", rank: "29th", year: "2024" },
    { name: "BYU CTF 2024", team: "KSU Offensive Security Research Club", rank: "283/2419", year: "2024" },
    { name: "NCL Fall 2024 Team Game", team: "KSU Offensive Security Research Club", rank: "19/386", year: "2024" },
    { name: "NCL Fall 2024 Individual Game", team: "KSU Offensive Security Research Club", rank: "37/7403", year: "2024" },
    { name: "NCL Fall 2023 Team Game", team: "KSU Offensive Security Research Club", rank: "51/4672", year: "2023" },
    { name: "NCL Fall 2023 Individual Game", team: "KSU Offensive Security Research Club", rank: "234/7934", year: "2023" }
];

// Reports Registry - Add/Remove files here, and the site will fetch them.
const reports = [
    {
        title: "Brainfkd Challenge",
        category: "Reverse Engineering",
        file: "reports/Brainfkd ScarletCTF2026.md"
    },
    {
        title: "Miss-Input Solution",
        category: "Web Exploitation",
        file: "reports/Miss-Input Solution ScarletCTF2026.md"
    },
    {
        title: "Girly Pop Inc",
        category: "Web / LFI",
        file: "reports/SWE Intern at Girly Pop Inc ScartletCTF2026.md"
    },
    {
        title: "hxp Shell Decoding",
        category: "Reverse Engineering",
        file: "reports/hxp_shell_decoding_writeup.md"
    },
    {
        title: "Matrix 500",
        category: "Cryptography",
        file: "reports/matrix_500_writeup.md"
    },
    {
        title: "Something Feels Off",
        category: "Forensics",
        file: "reports/Somethingfeelsoff.md"
    },
    {
        title: "Brainfast",
        category: "Pwn",
        file: "reports/BrainfastReportPwn.md"
    },
    {
        title: "Cassandra",
        category: "Pwn",
        file: "reports/CassandraReportPwn.md"
    },
    {
        title: "SLOT",
        category: "Pwn",
        file: "reports/SLOTReportPwn.md"
    }
];

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    initCTFTable();
    initReports();
    initModal();
    initGallery();
    initMobileMenu();
});

// Mobile Menu Toggle
function initMobileMenu() {
    const menuBtn = document.querySelector('.mobile-menu-btn');
    const navLinks = document.querySelector('.nav-links');

    if (menuBtn && navLinks) {
        menuBtn.addEventListener('click', () => {
            navLinks.classList.toggle('mobile-open');
            // Toggle icon between bars and X
            const icon = menuBtn.querySelector('i');
            if (icon) {
                icon.classList.toggle('fa-bars');
                icon.classList.toggle('fa-times');
            }
        });

        // Close menu when a link is clicked
        navLinks.querySelectorAll('a').forEach(link => {
            link.addEventListener('click', () => {
                navLinks.classList.remove('mobile-open');
                const icon = menuBtn.querySelector('i');
                if (icon) {
                    icon.classList.remove('fa-times');
                    icon.classList.add('fa-bars');
                }
            });
        });
    }
}

// Gallery Pagination - Show first 6 images, button to show more
function initGallery() {
    const galleryItems = document.querySelectorAll('#physical-gallery .gallery-item');
    const showMoreBtn = document.getElementById('show-more-btn');
    const itemsToShow = 6;
    let isExpanded = false;

    // Hide items beyond the first 6
    galleryItems.forEach((item, index) => {
        if (index >= itemsToShow) {
            item.classList.add('hidden');
        }
    });

    // Button click handler
    if (showMoreBtn) {
        showMoreBtn.addEventListener('click', () => {
            if (!isExpanded) {
                // Show all images
                galleryItems.forEach(item => item.classList.remove('hidden'));
                showMoreBtn.textContent = 'Show Less Photos';
                isExpanded = true;
            } else {
                // Hide extra images
                galleryItems.forEach((item, index) => {
                    if (index >= itemsToShow) {
                        item.classList.add('hidden');
                    }
                });
                showMoreBtn.textContent = 'Show More Photos';
                isExpanded = false;
            }
        });
    }
}

// Render CTF Table with Team Column
function initCTFTable() {
    const tbody = document.getElementById('ctf-list-body');
    const showMoreBtn = document.getElementById('ctf-show-more-btn');
    let html = '';
    let isExpanded = false;

    ctfData.forEach(ctf => {
        let rankClass = 'rank-badge';

        // Parse Rank Logic
        let rankNum = Infinity;
        const cleanRank = ctf.rank.toString().toLowerCase();

        if (cleanRank.includes('/')) {
            rankNum = parseInt(cleanRank.split('/')[0]);
        } else if (cleanRank.includes('rd') || cleanRank.includes('th') || cleanRank.includes('st') || cleanRank.includes('nd')) {
            rankNum = parseInt(cleanRank);
        } else if (!isNaN(cleanRank)) {
            rankNum = parseInt(cleanRank);
        }

        // Color Logic
        if (rankNum <= 3) {
            rankClass += ' rank-top'; // Green
        } else if (rankNum <= 10) {
            rankClass += ' rank-top-10'; // Yellow
        }

        // Hide pre-2025 entries initially
        const yearNum = parseInt(ctf.year);
        const hiddenClass = yearNum < 2025 ? 'ctf-hidden' : '';

        html += `
            <tr class="${hiddenClass}">
                <td data-label="Event">${ctf.name}</td>
                <td data-label="Team"><span class="team-tag">${ctf.team}</span></td>
                <td data-label="Rank"><span class="${rankClass}">${ctf.rank}</span></td>
                <td data-label="Year">${ctf.year}</td>
            </tr>
        `;
    });

    tbody.innerHTML = html;

    // Show More button handler for CTF
    if (showMoreBtn) {
        showMoreBtn.addEventListener('click', () => {
            const hiddenRows = tbody.querySelectorAll('.ctf-hidden');
            if (!isExpanded) {
                hiddenRows.forEach(row => row.classList.remove('ctf-hidden'));
                showMoreBtn.textContent = 'Show Less';
                isExpanded = true;
            } else {
                ctfData.forEach((ctf, index) => {
                    if (parseInt(ctf.year) < 2025) {
                        const row = tbody.querySelectorAll('tr')[index];
                        if (row) row.classList.add('ctf-hidden');
                    }
                });
                showMoreBtn.textContent = 'Show Earlier Placements';
                isExpanded = false;
            }
        });
    }
}

// Render Reports Grid
function initReports() {
    const grid = document.getElementById('reports-grid');
    grid.innerHTML = reports.map((report, index) => `
        <div class="report-card" onclick="openReport(${index})">
            <span class="category">${report.category}</span>
            <h3>${report.title}</h3>
            <p>Click to read case study...</p>
        </div>
    `).join('');
}

// Modal Logic
const modal = document.getElementById('report-modal');
const modalTitle = document.getElementById('modal-title');
const modalBody = document.getElementById('modal-body');
const closeBtn = document.querySelector('.close-modal');

async function openReport(index) {
    const report = reports[index];
    modalTitle.textContent = report.title;

    try {
        const response = await fetch(report.file);
        if (!response.ok) throw new Error("Failed to load report");
        const markdown = await response.text();

        // Render Markdown to HTML
        modalBody.innerHTML = marked.parse(markdown);

    } catch (error) {
        modalBody.innerHTML = `<p style="color: #e06c75;">Error loading report: ${error.message}</p>`;
    }

    modal.style.display = 'flex';
    document.body.style.overflow = 'hidden'; // Stop scrolling
}

function initModal() {
    closeBtn.onclick = () => {
        modal.style.display = 'none';
        document.body.style.overflow = 'auto';
    };

    window.onclick = (event) => {
        if (event.target === modal) {
            modal.style.display = 'none';
            document.body.style.overflow = 'auto';
        }
    };
}
