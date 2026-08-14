-- RequirementsPage.tsx groups requirements into Academic/Test/Additional
-- columns per category — not modeled in 0009's initial guess.
alter table program_requirements add column requirement_type text not null default 'Academic';
