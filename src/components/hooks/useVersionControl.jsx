import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";

export function useVersionControl(resumeId, resumeData) {
  const [versions, setVersions] = useState([]);
  const [versionCount, setVersionCount] = useState(0);
  const [savingVersion, setSavingVersion] = useState(false);

  useEffect(() => {
    if (resumeId) {
      loadVersions();
    }
  }, [resumeId]);

  const loadVersions = async () => {
    try {
      const versionsList = await base44.entities.ResumeVersion.filter(
        { resume_id: resumeId }, 
        "-created_date"
      );
      setVersions(versionsList);
      setVersionCount(versionsList.length);
    } catch (err) {
      console.error("Failed to load versions:", err);
    }
  };

  const saveVersion = async (customName = null, customNotes = "", dataToSave = null) => {
    const dataSnapshot = dataToSave || resumeData;
    
    if (!dataSnapshot?.id) return null;

    setSavingVersion(true);
    try {
      const nextVersionNumber = versionCount + 1;
      const defaultName = customName || `Version ${nextVersionNumber}`;

      const newVersion = await base44.entities.ResumeVersion.create({
        resume_id: resumeId,
        version_number: nextVersionNumber,
        data_snapshot: dataSnapshot,
        version_name: defaultName,
        notes: customNotes
      });

      setVersions([newVersion, ...versions]);
      setVersionCount(nextVersionNumber);
      
      return newVersion;
    } catch (err) {
      console.error("Failed to save version:", err);
      return null;
    } finally {
      setSavingVersion(false);
    }
  };

  const restoreVersion = async (version) => {
    if (!resumeData?.id) return false;
    
    try {
      const restoredData = {
        ...version.data_snapshot,
        id: resumeData.id, // Preserve the current resume data ID
        resume_id: resumeData.resume_id // Preserve the resume ID
      };
      await base44.entities.ResumeData.update(resumeData.id, restoredData);
      return restoredData;
    } catch (err) {
      console.error("Failed to restore version:", err);
      return false;
    }
  };

  const renameVersion = async (versionId, newName, newNotes) => {
    try {
      const version = versions.find(v => v.id === versionId);
      if (!version) return false;

      await base44.entities.ResumeVersion.update(versionId, {
        version_name: newName || `Version ${version.version_number}`,
        notes: newNotes || ""
      });

      setVersions(versions.map(v =>
        v.id === versionId
          ? { ...v, version_name: newName, notes: newNotes }
          : v
      ));
      
      return true;
    } catch (err) {
      console.error("Failed to rename version:", err);
      return false;
    }
  };

  const deleteVersion = async (versionId) => {
    try {
      await base44.entities.ResumeVersion.delete(versionId);
      setVersions(versions.filter(v => v.id !== versionId));
      setVersionCount(versionCount - 1);
      return true;
    } catch (err) {
      console.error("Failed to delete version:", err);
      return false;
    }
  };

  return {
    versions,
    versionCount,
    savingVersion,
    saveVersion,
    restoreVersion,
    renameVersion,
    deleteVersion,
    reloadVersions: loadVersions
  };
}