SELECT Projects.Code, Projects.Name, Projects.Location, 'ME' AS Div, Employees_1.Email AS Email_DivMan, Employees_2.Email AS Email_SC, Employees.Name AS Nama_SiteManager, Employees.Email AS Email_SiteManager, 
                  Employees.EmployeeNumber AS HP_SiteManager
FROM     Projects INNER JOIN
                  Divisions ON Projects.MainDivision_id = Divisions.Id INNER JOIN
                  Employees ON Projects.SiteManager_id = Employees.Id INNER JOIN
                  Employees AS Employees_1 ON Projects.DivisionManager_id = Employees_1.Id INNER JOIN
                  Employees AS Employees_2 ON Projects.ProjectManager_id = Employees_2.Id
WHERE  (Projects.ProjectStatus = N'Active') AND (Divisions.Code = '01')