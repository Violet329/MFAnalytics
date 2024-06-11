/*import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const response = await openai.chat.completions.create({
  model: "gpt-3.5-turbo",
  messages: [
    {
      role: "user",
      content: "",
    },
  ],
  temperature: 1,
  max_tokens: 256,
  top_p: 1,
  frequency_penalty: 0,
  presence_penalty: 0,
});
*/
async function runAnalytics() {
  const outputDiv = document.getElementById("output");
  outputDiv.innerHTML = "<p>Loading...</p>";
  try {
    // Get user inputs
    const email = document.getElementById("email").value;
    const apiKey = document.getElementById("apiKey").value;
    const region = document.getElementById("regionToggle").checked
      ? "eu"
      : "us";
    const websiteId = document.getElementById("websiteId").value;
    const fromDate = document.getElementById("fromDate").value;
    const toDate = document.getElementById("toDate").value;
    const script = document.getElementById("scriptSelector").value;
    const tagName = document.getElementById("tag_s").value;
 //   const corsAnywhere = "https://corsproxy.io/?";

    // Construct API request URL based on the selected script
    let requestString;
    if (script === "clickError") {
      requestString = `https://api-${region}.mouseflow.com/websites/${websiteId}/recordings?tags=click-error&fromdate=${fromDate}&todate=${toDate}`;
    } else if (script === "loginStats") {
      requestString = `https://api-${region}.mouseflow.com/account/users/stats`;
    } else if (script === "topCitiesCountries" || script === "referrerStats") {
      requestString = `https://api-${region}.mouseflow.com/websites/${websiteId}/recordings?limit=10000&fromdate=${fromDate}&todate=${toDate}`;
    } else if (script === "userCsv") {
      requestString = `https://api-${region}.mouseflow.com/account/users/list`;
    } else if (script === "searchTag") {
      requestString = `https://api-${region}.mouseflow.com/websites/${websiteId}/stats?tags=${tagName}&fromDate=${fromDate}&toDate=${toDate}`;
    } else if (script === "tagVar") {
      requestString = `https://api-${region}.mouseflow.com/websites/${websiteId}/stats?fromDate=${fromDate}&toDate=${toDate}`;
    } else if (script === "averageSessions") {
      requestString = `https://api-${region}.mouseflow.com/account/usage-report`; //this endpoint is only available to the account owner, might need a hacky solution to get this data in case a subuser tries
    }

    // Make API request
    const response = await fetch(requestString, {
      method: "GET",
      headers: {
        Authorization: "Basic " + btoa(`${email}:${apiKey}`),
        "Access-Control-Allow-Origin": "*"
      },
    });

    // Check if the response is successful
    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }

    // Process data and display on the webpage
    const data = await response.json();
    outputDiv.textContent = ""; // Clear previous output

    if (script === "clickError") {
      // Process click error data...
      const clickErrorIds = data.recordings
        .filter(
          (recording) =>
            recording.tags && recording.tags.includes("click-error")
        )
        .map((recording) => recording.id);

      const pageviewList = [];

      for (const id of clickErrorIds) {
        const clickErrorPageViewsRequestString = `https://api-${region}.mouseflow.com/websites/${websiteId}/recordings/${id}`;
        const clickErrorPageViewsResponse = await fetch(
          clickErrorPageViewsRequestString,
          {
            method: "GET",
            headers: {
              Authorization: "Basic " + btoa(`${email}:${apiKey}`),
            },
          }
        );

        const clickErrorPageViewsData =
          await clickErrorPageViewsResponse.json();

        const clickErrorPageViews = clickErrorPageViewsData.pageViews
          .filter(
            (pageView) => pageView.tags && pageView.tags.includes("click-error")
          )
          .map((pageView) => pageView.id);

        pageviewList.push(...clickErrorPageViews);

        for (const pvID of pageviewList) {
          const pageViewDataRequestString = `https://api-${region}.mouseflow.com/websites/${websiteId}/recordings/${id}/pageviews/${pvID}/data`;
          const pageViewDataResponse = await fetch(pageViewDataRequestString, {
            method: "GET",
            headers: {
              Authorization: "Basic " + btoa(`${email}:${apiKey}`),
            },
          });

          try {
            const pageViewData = await pageViewDataResponse.json();

            for (const item of pageViewData.javascriptErrors || []) {
              // Display click errors on the screen
              outputDiv.innerHTML += `
                  <p><strong>Error: </strong>${item.errorMessage}</p>
                  <p><strong>Location: </strong>${item.url}, Line ${
                item.line
              }, Column ${item.column}</p>
                  <p><strong>Stack Trace :</strong>${item.stack}</p>
                  <p><strong>Error Time : </strong>${new Date(
                    Number(item.errorTime)
                  ).toString()}</p><hr>`;
            }
          } catch (error) {
            console.error("Error parsing JSON:", error);
            window._mfq = window._mfq || [];
            window._mfq.push(["addFriction", "1", "api-error"]);
            continue;
          }
        }
      }

      // Display success message on the webpage
      outputDiv.innerHTML += "<p>*No more data to display*</p>";
    } else if (script === "topCitiesCountries") {
      // Process top cities and countries data...
      const allRecordings = data.recordings;

      // Process top cities data...
      const allCities = allRecordings
        .map((recording) => recording.city)
        .filter((city) => city);
      const totalCities = allCities.length;
      const topCities = new Map(
        [...new Set(allCities)].map((city) => [
          city,
          allCities.filter((c) => c === city).length,
        ])
      );

      outputDiv.innerHTML += "<p><b>Top 100 Cities:</b></p>";
      let citiesCount = 0;
      for (const [city, count] of [...topCities].sort((a, b) => b[1] - a[1])) {
        if (citiesCount >= 100) break;
        const percentage = ((count / totalCities) * 100).toFixed(2);
        outputDiv.innerHTML += `<p>${
          city || "Unknown"
        }: ${count} (${percentage}%)</p>`;
        citiesCount++;
      }
      // Process top countries data...
      const allCountries = allRecordings
        .map((recording) => recording.country)
        .filter((country) => country);
      const totalCountries = allCountries.length;
      const topCountries = new Map(
        [...new Set(allCountries)].map((country) => [
          country,
          allCountries.filter((c) => c === country).length,
        ])
      );
      outputDiv.innerHTML += "<hr><p><b>Top 100 Countries:</b></p>";
      let countriesCount = 0;
      for (const [countryCode, count] of [...topCountries].sort(
        (a, b) => b[1] - a[1]
      )) {
        if (countriesCount >= 100) break;
        const percentage = ((count / totalCountries) * 100).toFixed(2);
        outputDiv.innerHTML += `<p>${
          countryCode || "Unknown"
        }: ${count} (${percentage}%)</p>`;
        countriesCount++;
      }
    } else if (script === "loginStats") {
      // Sort data in descending order of totalLogins
      const sortedData = data.sort((a, b) => b.totalLogins - a.totalLogins);

      // Process data and display on the webpage
      outputDiv.textContent = ""; // Clear previous output
      outputDiv.innerHTML +=
        "<p><i>Note: This script ignores date range</i></p><p><b>Most active to least active users:</b></p>";
      for (const entry of sortedData) {
        outputDiv.innerHTML += `<p>${entry.email}: ${entry.totalLogins}</p>`;
      }

      const lessThan5Logins = sortedData.filter(
        (entry) => entry.totalLogins < 5
      );
      outputDiv.innerHTML += "<p><b>Users with Less Than 5 Logins:</b></p>";
      for (const entry of lessThan5Logins) {
        outputDiv.innerHTML += `<p>${entry.email}: ${entry.totalLogins}</p>`;
      }

      const totalLogins = sortedData.reduce(
        (sum, entry) => sum + entry.totalLogins,
        0
      );
      outputDiv.innerHTML += `<p><b>Total Account Logins: ${totalLogins}</b></p>`;
      console.log("Data processed and displayed.");
    } else if (script === "referrerStats") {
      if ("recordings" in data) {
        const allReferrers = data.recordings
          .filter((recording) => recording.referrer)
          .map((recording) => recording.referrer);

        const topRef = [
          ...new Map(
            allReferrers.map((referrer) => [
              referrer,
              allReferrers.filter((r) => r === referrer).length,
            ])
          ).entries(),
        ].sort((a, b) => b[1] - a[1]);

        outputDiv.innerHTML += "<p>Top 100 referrers:</p>";
        outputDiv.innerHTML += "<p>----|URL|----|Count|----|Percentage|</p>";
        for (const [referrer, count] of topRef) {
          const percent = (count / data.recordings.length) * 100;
          outputDiv.innerHTML += `<p>= ${referrer}| ${count} | ${percent.toFixed(
            2
          )}%</p>`;
        }
      } else {
        outputDiv.innerHTML += "<p>No recordings found in the response.</p>";
      }
    } else if (script === "userCsv") {
      outputDiv.textContent = "";
      const result = data
        .map((item) => {
          const { email, permissionRole, permissions, lastSignedIn, active } =
            item;

          if (permissions && permissions.length > 0) {
            const combinedPermissions = permissions
              .map(
                (permission) =>
                  `${permission.websiteName || ""} (${
                    permission.customPermission || ""
                  })`
              )
              .join(":");

            return {
              email,
              permissionRole,
              combinedPermissions,
              lastSignedIn,
              active,
            };
          } else {
            return {
              email,
              permissionRole,
              combinedPermissions: "", // Ensure it's not undefined
              lastSignedIn,
              active,
            };
          }
        })
        .flat();

      outputDiv.innerHTML +=
        "<p><i>Note: Date range does not affect this csv. Click the download button. This script fixes a csv generation bug that occurs in the app and returns proper data.<i></p>";

      // Add a button to download data as CSV
      const downloadButton = document.createElement("button");
      downloadButton.textContent = "Download CSV";
      downloadButton.addEventListener("click", () => downloadCSV(result));
      outputDiv.appendChild(downloadButton);
    } else if (script === "tagVar") {
      outputDiv.textContent += "Loading...";
      function getTopItems(items, limit) {
        const counter = items.reduce((acc, item) => {
          acc[item] = (acc[item] || 0) + 1;
          return acc;
        }, {});

        return Object.entries(counter)
          .sort((a, b) => b[1] - a[1])
          .slice(0, limit);
      }

      const requestString = `https://api-${region}.mouseflow.com/websites/${websiteId}/recordings?limit=10000&fromdate=${fromDate}&todate=${toDate}`;
      const tagVarResponse = await fetch(requestString, {
        method: "GET",
        headers: {
          Authorization: "Basic " + btoa(`${email}:${apiKey}`),
        },
      });

      if (!tagVarResponse.ok) {
        throw new Error(`HTTP error! Status: ${tagVarResponse.status}`);
      }

      const tagVarData = await tagVarResponse.json();

      // Extract tags and variables from recordings
      const allTags = tagVarData.recordings.flatMap(
        (recording) => recording.tags
      );
      const allVariables = tagVarData.recordings.flatMap(
        (recording) => recording.variables
      );

      const topTags = getTopItems(allTags, 20);
      const topVariables = getTopItems(allVariables, 20);

      if (topTags.length) {
        outputDiv.innerHTML = "<p><b>Top 20 Tags:</b>\n";
        topTags.forEach(([tag, count]) => {
          //      const percentage = ((count / allTags.length) * 100).toFixed(2); This gives percentage of tags and not percenteage of recordings containing the tag
          outputDiv.innerHTML += `- ${tag}: ${count}\n</p>`;
        });
      }

      if (topVariables.length) {
        outputDiv.innerHTML += "<hr><p><b>Top 20 Variables:</b>\n";
        topVariables.forEach(([variable, count]) => {
          //   const percentage = ((count / allVariables.length) * 100).toFixed(2); This gives percentage of tags and not percenteage of recordings containing the tag
          outputDiv.innerHTML += `- ${variable}: ${count}\n</p>`;
        });
      }
    } else if (script === "searchTag") {
      const requestStringF = `https://api-${region}.mouseflow.com/websites/${websiteId}/stats?fromDate=${fromDate}&toDate=${toDate}`;
      const reqTagS = await fetch(requestStringF, {
        method: "GET",
        headers: {
          Authorization: "Basic " + btoa(`${email}:${apiKey}`),
        },
      });
      const dataTagS = await reqTagS.json();

      const tagSessionCount = data.sessionCount;
      const percentage = (tagSessionCount / dataTagS.sessionCount) * 100;

      const friction = data.averageFrictionScore;

      outputDiv.textContent = "";
      outputDiv.innerHTML += `<p>Sessions with this tag: ${tagSessionCount}</p>`;
      outputDiv.innerHTML += `<p>Percentage of sessions that contain this tag: ${percentage.toFixed(
        2
      )}%</p>`;
      outputDiv.innerHTML += `<p>Average friction score of sessions with this tag: ${friction}</p>`;

      // Fetch and process page list
      const requestStringTag = `https://api-${region}.mouseflow.com/websites/${websiteId}/pagelist?tags=${tagName}&fromDate=${fromDate}&toDate=${toDate}`;
      const reqTag = await fetch(requestStringTag, {
        method: "GET",
        headers: {
          Authorization: "Basic " + btoa(`${email}:${apiKey}`),
        },
      });
      const dataTag = await reqTag.json();

      const sortedPages = dataTag.pages.sort((a, b) => b.views - a.views);
      const top10Pages = sortedPages.slice(0, 10);
      const top10DisplayUrls = top10Pages.map(
        (page) => `- ${page.displayUrl}<br \>`
      );

      outputDiv.innerHTML += "<hr><p><b>Top 10 Pages with this tag:</b></p>";
      outputDiv.innerHTML += `<p>${top10DisplayUrls.join(" ")}</p>`;
    } else if (script === "averageSessions") {
      /* This is for mapping the website ids to website names
      
      const requestStringF = `https://api-${region}.mouseflow.com/websites`;
      const req = await fetch(requestStringF, {
        method: "GET",
        headers: {
          Authorization: "Basic " + btoa(`${email}:${apiKey}`),
        },
      });
      const reqData = await reqTagS.json();
      */
      function calculateAverageCount(sessions) {
        const twelveMonthsAgo = new Date();
        twelveMonthsAgo.setUTCMonth(twelveMonthsAgo.getUTCMonth() - 12);

        const relevantSessions = sessions.filter(
          (session) => new Date(session.date) >= twelveMonthsAgo
        );

        const total = relevantSessions.reduce(
          (sum, session) => sum + session.count,
          0
        );
        const average =
          relevantSessions.length > 0 ? total / relevantSessions.length : 0;

        return average;
      }

      function calculateAverages(websites) {
        const averages = websites.map((website) => {
          const websiteId = website.websiteId;
          const averageCount = calculateAverageCount(website.sessions);
          return { websiteId, averageCount };
        });

        return averages;
      }

      const averages = calculateAverages(data.websites);
      // outputDiv.innerHTML = `<p>${averages}</p>`;

      console.log(averages);
    }
  } catch (error) {
    console.error("Error:", error);
  }
}

function downloadCSV(data) {
  const csvContent =
    "Email,Permission Role,Custom Access,Last Sign-in,Account Active\n" +
    data
      .map((row) =>
        [
          row.email,
          row.permissionRole,
          row.combinedPermissions,
          row.lastSignedIn,
          row.active,
        ].join(",")
      )
      .join("\n");

  const encodedUri = encodeURI("data:text/csv;charset=utf-8," + csvContent);
  const link = document.createElement("a");
  link.setAttribute("href", encodedUri);
  link.setAttribute("download", "user_data.csv");
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
