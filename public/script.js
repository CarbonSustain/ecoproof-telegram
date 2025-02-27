document.addEventListener("DOMContentLoaded", function () {
    fetch("./leaderboard")
        .then(response => response.json())
        .then(data => {
            const leaderboardTable = document.getElementById("leaderboard");
            leaderboardTable.innerHTML = ""; // Clear existing rows

            data.forEach((user, index) => {
                const row = document.createElement("tr");
                row.innerHTML = `
                    <td>${index + 1}</td>
                    <td>${user.firstName}</td>
                    <td>@${user.username || "N/A"}</td>
                    <td>${user.shareCount}</td>
                    <td>${user.pointsCount}</td>
                `;
                leaderboardTable.appendChild(row);
            });
        })
        .catch(error => console.error("Error fetching leaderboard:", error));
});
