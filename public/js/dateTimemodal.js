function getHistory() {
  const source = document.querySelector("select.custom-input")?.value;
  const startDate = document.getElementById("startDate")?.value;
  const endDate = document.getElementById("endDate")?.value;

  const params = new URLSearchParams();

  if (source) params.append("source", source);
  if (startDate) params.append("startDate", startDate);
  if (endDate) params.append("endDate", endDate);

  // pagination reset
  params.append("page", 1);

  window.location.href = `/user-win-history?${params.toString()}`;
}