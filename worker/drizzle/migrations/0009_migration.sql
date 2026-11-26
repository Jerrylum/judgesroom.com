-- This update adds new "Notebook Link Broken" status to the notebook 
-- development status enum. Existing rooms has "digital" as the default 
-- notebook submission method.
-- This update leaves notebook statuses as stored. Teams with no link are
-- still Not Reviewed (undetermined) and are not rewritten to Not Submitted.
ALTER TABLE `Metadata` ADD `notebookSubmissionMethod` text DEFAULT 'digital' NOT NULL;
