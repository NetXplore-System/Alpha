import { toast } from "react-hot-toast";

export const saveToDB = async (
  id,
  name,
  description,
  file,
  params,
  selectedMetric = "Degree Centrality",
  comparison
) => {

  try {
    const formData = new FormData();

    formData.append("research_name", name);
    formData.append("researcher_id", id);
    formData.append("description", description);
    comparison.hasComparison && formData.append("comparison", JSON.stringify(comparison.data));
    formData.append("file_name", file);
    formData.append("selected_metric", selectedMetric);


    const response = await fetch(
      `${import.meta.env.VITE_API_URL}/save-research?${params.toString()}`,
      {
        method: "POST",
        body: formData,
      }
    );

    const data = await response.json();

    if (response.ok) {
      toast.success(data?.detail || "Research saved successfully!");
    } else {
      toast.error(data?.detail || "An error occurred while saving the research.");
    }
  } catch (error) {
    toast.error("An error occurred while saving the research.");
    console.error("Save error:", error);
  }
};
